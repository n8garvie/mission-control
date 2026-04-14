#!/usr/bin/env node
/**
 * Manual Build Trigger
 * 
 * Spawns agents for a build that's been queued by overnight-build.sh
 * Usage: node manual-build.js <idea-id-or-title>
 * 
 * This implements Option C: Overnight picks 1 idea, manual agent spawn
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_DIR = '/home/n8garvie/.openclaw/workspace/mission-control';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Agent configurations
const AGENTS = {
  forge: {
    model: 'anthropic/claude-opus-4-6',
    timeout: 1800,
    description: 'Architecture Agent - designs system, tech stack, creates project structure'
  },
  pixel: {
    model: 'anthropic/claude-sonnet-4-6',
    timeout: 2400,
    description: 'Design Agent - creates UI, components, responsive design'
  },
  echo: {
    model: 'moonshot/kimi-k2.5',
    timeout: 900,
    description: 'Copy Agent - writes all content, UI text, marketing copy'
  },
  integrator: {
    model: 'anthropic/claude-opus-4-6',
    timeout: 2400,
    description: 'Integration Agent - combines all agent outputs into working app'
  }
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function getIdeaFromConvex(ideaId) {
  try {
    const output = execSync(
      `cd "${MISSION_CONTROL_DIR}/dashboard" && npx convex run ideas:get '{"id":"${ideaId}"}'`,
      { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY } }
    );
    return JSON.parse(output);
  } catch (err) {
    log(`Error fetching idea: ${err.message}`);
    return null;
  }
}

async function findIdeaByTitle(title) {
  try {
    const output = execSync(
      `cd "${MISSION_CONTROL_DIR}/dashboard" && npx convex run ideas:listByStatus '{"status":"building"}'`,
      { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY } }
    );
    const ideas = JSON.parse(output);
    return ideas.find(i => i.title.toLowerCase().includes(title.toLowerCase()));
  } catch (err) {
    log(`Error searching ideas: ${err.message}`);
    return null;
  }
}

function createTaskFile(agentName, idea, buildPath) {
  const agentConfig = AGENTS[agentName];
  const taskDir = path.join(buildPath, agentName);
  fs.mkdirSync(taskDir, { recursive: true });
  
  const task = {
    agent: agentName,
    ideaId: idea._id,
    title: idea.title,
    description: idea.description,
    targetAudience: idea.targetAudience,
    mvpScope: idea.mvpScope,
    potential: idea.potential,
    model: agentConfig.model,
    timeout: agentConfig.timeout,
    deliverables: `${taskDir}/`,
    status: 'ready_to_spawn',
    createdAt: new Date().toISOString()
  };
  
  const taskFile = path.join(taskDir, `${agentName}-task.json`);
  fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
  
  return { taskFile, taskDir, task };
}

async function spawnAgent(agentName, task) {
  const agentConfig = AGENTS[agentName];
  
  const prompt = `You are ${agentName.toUpperCase()}, the ${agentConfig.description}.

Build: ${task.title}

Description: ${task.description}

Target Audience: ${task.targetAudience || 'General users'}

MVP Scope: ${task.mvpScope || 'Create a functional MVP with core features'}

Deliver all work to: ${task.deliverables}

Include a COMPLETION.md file summarizing what you created.`;

  log(`Spawning ${agentName}...`);
  
  try {
    // Try openclaw CLI
    const result = execSync(
      `openclaw sessions spawn --label "${agentName}-${task.ideaId.substring(0, 8)}" --model ${agentConfig.model} --timeout ${agentConfig.timeout} --task "${prompt.replace(/"/g, '\\"').substring(0, 500)}..."`,
      { 
        encoding: 'utf-8', 
        timeout: 15000,
        env: { 
          ...process.env, 
          PATH: '/home/n8garvie/.nvm/versions/node/v22.22.0/bin:' + process.env.PATH 
        }
      }
    );
    log(`✓ ${agentName} spawned: ${result.trim()}`);
    return { success: true, output: result };
  } catch (err) {
    log(`✗ ${agentName} failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  const searchTerm = process.argv[2];
  
  if (!searchTerm) {
    console.log('Usage: node manual-build.js <idea-id-or-title>');
    console.log('');
    console.log('Current building ideas:');
    try {
      const output = execSync(
        `cd "${MISSION_CONTROL_DIR}/dashboard" && npx convex run ideas:listByStatus '{"status":"building"}'`,
        { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY } }
      );
      const ideas = JSON.parse(output);
      ideas.slice(0, 5).forEach(i => console.log(`  - ${i.title} (${i._id})`));
    } catch {}
    process.exit(1);
  }
  
  // Find the idea
  let idea = null;
  if (searchTerm.startsWith('k')) {
    idea = await getIdeaFromConvex(searchTerm);
  } else {
    idea = await findIdeaByTitle(searchTerm);
  }
  
  if (!idea) {
    log(`Idea not found: ${searchTerm}`);
    process.exit(1);
  }
  
  log(`Found idea: ${idea.title}`);
  log(`Status: ${idea.status}`);
  log(`Potential: ${idea.potential}`);
  
  // Create build directory
  const buildPath = path.join(MISSION_CONTROL_DIR, 'builds', idea._id);
  fs.mkdirSync(buildPath, { recursive: true });
  
  log(`\nBuild directory: ${buildPath}`);
  log(`\nSpawning agents in sequence...\n`);
  
  // Spawn agents in order
  const agentOrder = ['forge', 'pixel', 'echo', 'integrator'];
  
  for (const agentName of agentOrder) {
    const { taskFile } = createTaskFile(agentName, idea, buildPath);
    log(`Created task: ${taskFile}`);
    
    const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
    const result = await spawnAgent(agentName, task);
    
    if (!result.success) {
      log(`\n⚠️  ${agentName} failed. Stopping chain.`);
      log(`To retry: node manual-build.js ${idea._id}`);
      process.exit(1);
    }
    
    // Small delay between spawns
    await new Promise(r => setTimeout(r, 2000));
  }
  
  log('\n✓ All agents spawned successfully!');
  log(`Monitor progress: https://dashboard-jnst3t9xe-n8garvies-projects.vercel.app`);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
