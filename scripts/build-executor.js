#!/usr/bin/env node
/**
 * Build Executor - Direct Agent Execution
 * 
 * Spawns sub-agents via OpenClaw gateway to actually execute build tasks.
 * Replaces the stub assign_to_agent function in overnight-build.sh
 * 
 * Usage: node build-executor.js <agent> <idea-id> <title> <description> <mvp-scope>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_TOKEN || '';

// Agent task definitions
const AGENT_TASKS = {
  forge: {
    model: 'anthropic/claude-opus-4-6',
    timeout: 1800, // 30 minutes
    systemPrompt: `You are Forge, the Architecture Agent for Mission Control.
Your job is to design technical architecture for web applications.

You must:
1. Create a system design document
2. Define the tech stack (Next.js, Convex, etc.)
3. Create the project structure
4. Write initial configuration files
5. Output ready-to-use code

Be thorough. Write actual files. Don't just describe what to do.`
  },
  
  pixel: {
    model: 'moonshot/kimi-k2.5',
    timeout: 2400, // 40 minutes
    systemPrompt: `You are Pixel, the Design Agent for Mission Control.
Your job is to create UI designs and component code.

You must:
1. Analyze the product requirements
2. Create design system (colors, typography, spacing)
3. Generate component code (React/Tailwind)
4. Ensure responsive design
5. Output production-ready components

Create actual files. Don't just describe designs.`
  },
  
  echo: {
    model: 'moonshot/kimi-k2.5',
    timeout: 900, // 15 minutes
    systemPrompt: `You are Echo, the Copy Agent for Mission Control.
Your job is to write all copy and content for web applications.

You must:
1. Write onboarding copy
2. Create UI text and labels
3. Write marketing descriptions
4. Ensure consistent voice
5. Output copy as structured data or files

Write actual content. Don't just outline what to write.`
  },
  
  lens: {
    model: 'moonshot/kimi-k2.5',
    timeout: 600, // 10 minutes
    systemPrompt: `You are Lens, the QA Agent for Mission Control.
Your job is to review deployed applications and verify they work.

You must:
1. Navigate to the deployed URL
2. Take screenshots of key pages
3. Verify core functionality loads
4. Report any critical errors
5. Send results to the user

Be thorough in your review. Capture visual evidence.`
  }
};

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

async function spawnAgent(agentName, ideaId, title, description, mvpScope) {
  const agentConfig = AGENT_TASKS[agentName];
  if (!agentConfig) {
    log(`Unknown agent: ${agentName}`);
    return { success: false, error: 'Unknown agent' };
  }

  log(`Spawning ${agentName} for idea: ${title}`);

  const buildPath = `/home/n8garvie/.openclaw/workspace/mission-control/builds/${ideaId}/${agentName}`;
  fs.mkdirSync(buildPath, { recursive: true });

  const task = `Build ${title}

Description: ${description}

MVP Scope: ${mvpScope}

Idea ID: ${ideaId}

Your deliverables must be saved to:
${buildPath}/

Include a completion report at:
${buildPath}/COMPLETION.md`;

  try {
    // Create task file for tracking
    const taskFile = path.join(buildPath, `${agentName}-task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      agent: agentName,
      ideaId,
      title,
      description,
      mvpScope,
      task,
      model: agentConfig.model,
      timeout: agentConfig.timeout,
      systemPrompt: agentConfig.systemPrompt,
      assignedAt: new Date().toISOString(),
      status: 'spawning'
    }, null, 2));

    // Try to spawn via OpenClaw gateway API
    if (GATEWAY_TOKEN) {
      try {
        log(`Calling OpenClaw gateway to spawn ${agentName}...`);
        const response = execSync(
          `curl -s -X POST "${GATEWAY_URL}/api/sessions/spawn" \\
            -H "Authorization: Bearer ${GATEWAY_TOKEN}" \\
            -H "Content-Type: application/json" \\
            -d '${JSON.stringify({
              agentId: agentName,
              task: task,
              model: agentConfig.model,
              timeoutSeconds: agentConfig.timeout,
              systemPrompt: agentConfig.systemPrompt
            }).replace(/'/g, "'\"'")}'`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        
        const result = JSON.parse(response);
        log(`Spawned session: ${result.sessionKey || result.id || 'unknown'}`);
        
        // Update task file with session info
        const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
        taskData.status = 'spawned';
        taskData.sessionKey = result.sessionKey || result.id;
        taskData.spawnedAt = new Date().toISOString();
        fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
        
        return { success: true, sessionKey: result.sessionKey || result.id };
      } catch (spawnErr) {
        log(`Gateway spawn failed: ${spawnErr.message}. Task queued for manual execution.`);
        // Continue to fallback
      }
    }

    // Fallback: Use openclaw CLI if available
    try {
      log(`Trying openclaw CLI spawn...`);
      const result = execSync(
        `openclaw sessions spawn --agent ${agentName} --label "${agentName}-${ideaId.substring(0, 8)}" --timeout ${agentConfig.timeout} --model ${agentConfig.model} --task "${task.replace(/"/g, '\\"').substring(0, 200)}..." 2>&1`,
        { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PATH: '/home/n8garvie/.nvm/versions/node/v22.22.0/bin:' + process.env.PATH } }
      );
      log(`CLI spawn result: ${result}`);
      
      const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
      taskData.status = 'spawned-via-cli';
      taskData.cliOutput = result;
      fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
      
      return { success: true, cli: true, output: result };
    } catch (cliErr) {
      log(`CLI spawn failed: ${cliErr.message}`);
    }

    // If we get here, task is queued but not spawned
    const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
    taskData.status = 'pending';
    taskData.queuedAt = new Date().toISOString();
    fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
    
    return { 
      success: true, 
      queued: true,
      taskFile,
      message: `Task queued. Run manually: openclaw sessions spawn --agent ${agentName} --task-file ${taskFile}`
    };

  } catch (err) {
    log(`Error spawning agent: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  const [agent, ideaId, title, description, mvpScope] = process.argv.slice(2);
  
  if (!agent || !ideaId || !title) {
    console.log('Usage: node build-executor.js <agent> <idea-id> <title> [description] [mvp-scope]');
    console.log('');
    console.log('Agents: forge, pixel, echo, lens');
    process.exit(1);
  }

  const result = await spawnAgent(agent, ideaId, title, description || '', mvpScope || '');
  
  if (result.success) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } else {
    console.error('Failed:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
