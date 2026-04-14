#!/usr/bin/env node
/**
 * Build Orchestrator - Automated Agent Pipeline
 * 
 * Chains agents automatically: Forge → Pixel → Echo → Screenshot
 * With Ralph Loop for Pixel ("This is terrible, make it simpler")
 * 
 * Usage: node build-orchestrator.js <idea-id>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080';

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

function readIdeaData(ideaId) {
  const trackerPath = path.join(BUILDS_DIR, `${ideaId}.json`);
  if (!fs.existsSync(trackerPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
}

async function spawnAgent(agentType, ideaId, ideaData) {
  const buildPath = path.join(BUILDS_DIR, ideaId, agentType);
  fs.mkdirSync(buildPath, { recursive: true });

  let task, model, timeout;

  if (agentType === 'pixel') {
    model = 'anthropic/claude-sonnet-4-6';  // Option B: Claude Sonnet 4.6 for better design taste
    timeout = 2400;
    
    // Option A: Give Pixel eyes - find Dribbble images to analyze
    const today = new Date().toLocaleDateString('en-US', { 
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');
    const dribbbleDir = `/home/n8garvie/NateMate/notes/NateMateNotes/Agent Saved/dribbble/${today}`;
    let dribbbleImages = [];
    if (fs.existsSync(dribbbleDir)) {
      dribbbleImages = fs.readdirSync(dribbbleDir)
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
        .slice(0, 5)
        .map(f => path.join(dribbbleDir, f));
    }
    
    task = `Design ${ideaData.title} UI

You are Pixel, the Design Agent using Claude Sonnet 4.6. You have EXCELLENT design taste and can analyze visual references.

**Product:** ${ideaData.title}
**Description:** ${ideaData.description}

**CRITICAL: ANALYZE DRIBBBLE REFERENCES FIRST**
Before designing, you MUST analyze the Dribbble reference images provided below. Look at:
- Color palettes (what specific hex values are used?)
- Typography (font weights, sizes, letter spacing)
- Layout patterns (spacing, grid, hierarchy)
- Visual effects (shadows, glows, gradients, glassmorphism)
- What makes each design feel premium/modern

${dribbbleImages.length > 0 ? '**DRIBBBLE REFERENCE IMAGES TO ANALYZE:**\n' + dribbbleImages.map((img, i) => (i + 1) + '. ' + img).join('\n') + '\n\nUse the image tool to view and analyze each reference. Extract specific design decisions you will apply.' : 'No Dribbble images available today - use best practices from top-tier design systems (Linear, Stripe, Apple).'}

**Design Requirements:**
1. Create a premium, modern dashboard UI
2. Design all key views/pages needed
3. Use Tailwind CSS with sophisticated dark theme
4. Bold typography, intentional hierarchy, generous whitespace

**CRITICAL - The "Ralph Loop":**
After your first design pass, evaluate: "This is terrible, make it simpler"

Then REDUCE ruthlessly:
- Remove 30% of UI elements
- Use max 3 colors
- Simplify navigation (max 3 top-level items)
- Bigger whitespace
- Less text, more hierarchy
- Flat design (no shadows unless essential)

**Deliverables (SAVE FILES):**
Save to: ${buildPath}/
1. design-system.md - Specific colors (hex values), typography scale, spacing tokens
2. dashboard-mockup.md - ASCII/text wireframes for all views
3. components.md - React component specs with exact Tailwind classes
4. COMPLETION.md - Summary + Ralph Loop simplifications + Dribbble inspiration notes

**MANDATORY:** Start by analyzing the Dribbble reference images. Document what you learned from each before designing.

**TASTE CALIBRATION (Option C):**
Reference the daily updated component library at:
/home/n8garvie/.openclaw/workspace/mission-control/agents/pixel/design-references/taste-calibration/

Before designing, check:
1. component-reference.json - Use exact Tailwind classes for buttons, cards, inputs
2. INDEX.md - Current taste principles and trending patterns
3. Design system references (linear/, stripe/, vercel/) for philosophy

**Taste Principles to Apply:**
- Every element must earn its place
- Color used sparingly creates impact (grayscale + one accent)
- Typography does the heavy lifting (size/weight hierarchy)
- Generous whitespace signals premium quality
- Flat design with strategic depth (glass, gradients)

**ASSET GENERATION (Nano Banana Pro):**
After completing the design system, generate visual assets using the nano-banana-pro skill:

1. App Icon - Generate a premium app icon for the product:
   Run: node /home/n8garvie/.openclaw/workspace/skills/nano-banana-pro/nano-banana-pro.js icon "${ideaData.title}" "${style}" "${buildPath}/assets/app-icon.png"

2. Hero Image (if applicable) - Generate a hero/landing page image:
   Run: node /home/n8garvie/.openclaw/workspace/skills/nano-banana-pro/nano-banana-pro.js hero "${ideaData.description}" "${buildPath}/assets/hero.png"

3. Placeholder Images - Generate 2-3 placeholder/mock images for the UI:
   Run: node /home/n8garvie/.openclaw/workspace/skills/nano-banana-pro/nano-banana-pro.js placeholder [watch|dashboard|user|upload] "${buildPath}/assets/placeholder-1.png"

Save all generated assets to: ${buildPath}/assets/

Use write tool. CREATE THE FILES.`;

  } else if (agentType === 'echo') {
    model = 'moonshot/kimi-k2.5';
    timeout = 900;
    task = `Write copy for ${ideaData.title}

You are Echo, the Copy Agent. Write all content for:

**Product:** ${ideaData.title}
**Description:** ${ideaData.description}
**Target:** ${ideaData.targetAudience || 'General users'}

**Write:**
1. Product tagline (10 words max)
2. One-paragraph description for landing page
3. Feature descriptions (3-5 features, 1 sentence each)
4. Onboarding copy (3 steps)
5. UI labels for main actions
6. Empty state messages
7. Error messages (3 common ones)
8. Marketing email subject line

**Tone:** Direct, minimal, no fluff. No em dashes.

**Deliverables (SAVE FILES):**
Save to: ${buildPath}/
1. copy.json - All copy as structured data
2. COMPLETION.md - Summary

Use write tool. CREATE THE FILES.`;

  } else {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  log(`Spawning ${agentType} for ${ideaData.title}...`);

  try {
    // Use openclaw CLI if available
    const result = execSync(
      `openclaw sessions spawn --agent main --label "${agentType}-${ideaId}" --timeout ${timeout} --task-file - << 'EOF'
${task}
EOF`,
      { 
        encoding: 'utf-8', 
        timeout: 10000,
        env: { ...process.env, PATH: '/home/n8garvie/.nvm/versions/node/v22.22.0/bin:' + process.env.PATH }
      }
    );
    log(`${agentType} spawned: ${result}`);
    return { success: true, output: result };
  } catch (err) {
    log(`${agentType} spawn via CLI failed: ${err.message}`);
    
    // Fallback: Create task file for manual execution
    const taskFile = path.join(buildPath, `${agentType}-task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      agent: agentType,
      ideaId,
      title: ideaData.title,
      task,
      model,
      timeout,
      status: 'pending',
      createdAt: new Date().toISOString()
    }, null, 2));
    
    log(`${agentType} task queued: ${taskFile}`);
    return { success: false, queued: true, taskFile };
  }
}

async function checkAgentCompletion(ideaId, agentType) {
  const completionPath = path.join(BUILDS_DIR, ideaId, agentType, 'COMPLETION.md');
  return fs.existsSync(completionPath);
}

async function spawnIntegrator(ideaId, ideaData) {
  const buildPath = path.join(BUILDS_DIR, ideaId, 'integrator');
  fs.mkdirSync(buildPath, { recursive: true });

  const model = 'anthropic/claude-opus-4-6';
  const timeout = 2400;
  
  const task = `Integrate: ${ideaData.title}

You are the Integrator. Combine outputs from all agents into a working application.

**Product:** ${ideaData.title}
**Description:** ${ideaData.description}

**Source Files:**
- Forge (architecture): /home/n8garvie/.openclaw/workspace/mission-control/builds/${ideaId}/forge/
- Pixel (design): /home/n8garvie/.openclaw/workspace/mission-control/builds/${ideaId}/pixel/
- Echo (copy): /home/n8garvie/.openclaw/workspace/mission-control/builds/${ideaId}/echo/

**Your Task:**
1. Read all agent outputs
2. Create a working Next.js app that combines everything
3. Use the architecture from Forge
4. Apply the design system from Pixel
5. Integrate all copy from Echo
6. Build all pages and components
7. Ensure TypeScript compiles
8. Ensure build passes (npm run build)

**Deliverables (SAVE TO):**
${buildPath}/final/
- Complete Next.js app with all pages
- All components styled per Pixel's design
- All copy from Echo integrated
- Working build (npm run build succeeds)
- README.md with setup instructions
- COMPLETION.md with summary

**CRITICAL:**
- The app MUST build successfully
- All pages must render without errors
- Use the exact design tokens from Pixel
- Use the exact copy from Echo
- Follow the architecture from Forge

Use write tool. CREATE THE FILES. Make it actually work.`;

  log(`Spawning Integrator for ${ideaData.title}...`);

  try {
    const result = execSync(
      `openclaw sessions spawn --agent main --label "integrator-${ideaId}" --timeout ${timeout} --task-file - << 'EOF'
${task}
EOF`,
      { 
        encoding: 'utf-8', 
        timeout: 10000,
        env: { ...process.env, PATH: '/home/n8garvie/.nvm/versions/node/v22.22.0/bin:' + process.env.PATH }
      }
    );
    log(`Integrator spawned: ${result}`);
    return { success: true, output: result };
  } catch (err) {
    log(`Integrator spawn via CLI failed: ${err.message}`);
    
    const taskFile = path.join(buildPath, `integrator-task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      agent: 'integrator',
      ideaId,
      title: ideaData.title,
      task,
      model,
      timeout,
      status: 'pending',
      createdAt: new Date().toISOString()
    }, null, 2));
    
    log(`Integrator task queued: ${taskFile}`);
    return { success: false, queued: true, taskFile };
  }
}

async function captureAndPushScreenshot(buildPath, ideaData) {
  log(`📸 Capturing screenshot for ${ideaData.title}...`);
  
  const finalPath = path.join(buildPath, 'integrator', 'final');
  if (!fs.existsSync(finalPath)) {
    log(`No final build found at ${finalPath}`);
    return { success: false, error: 'No final build' };
  }

  // Check if screenshot already exists
  const screenshotPath = path.join(finalPath, 'screenshot.png');
  if (fs.existsSync(screenshotPath)) {
    log(`Screenshot already exists: ${screenshotPath}`);
  }

  // Run the post-build screenshot script
  const screenshotScript = path.join(__dirname, '..', 'templates', 'post-build-screenshot.sh');
  
  try {
    // Change to the final build directory and run screenshot script
    const result = execSync(
      `cd "${finalPath}" && bash "${screenshotScript}"`,
      { 
        encoding: 'utf-8',
        timeout: 120000,
        env: { ...process.env, PATH: '/home/n8garvie/.nvm/versions/node/v22.22.0/bin:' + process.env.PATH }
      }
    );
    log(`Screenshot result: ${result}`);
    
    // Push to GitHub if repo exists
    const gitDir = path.join(finalPath, '.git');
    if (fs.existsSync(gitDir)) {
      log(`Pushing screenshot to GitHub...`);
      try {
        execSync(
          `cd "${finalPath}" && git push`,
          { encoding: 'utf-8', timeout: 30000 }
        );
        log(`✅ Screenshot pushed to GitHub`);
      } catch (pushErr) {
        log(`⚠️  Git push failed: ${pushErr.message}`);
      }
    }
    
    return { success: true };
  } catch (err) {
    log(`Screenshot capture failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function orchestrateBuild(ideaId) {
  log(`Starting orchestrated build for: ${ideaId}`);

  const ideaData = readIdeaData(ideaId);
  if (!ideaData) {
    log(`No tracker found for ${ideaId}`);
    process.exit(1);
  }

  // Check if Forge is complete
  const forgeComplete = await checkAgentCompletion(ideaId, 'forge');
  if (!forgeComplete) {
    log(`Forge not complete for ${ideaId}. Waiting...`);
    return;
  }

  // Spawn Pixel with Ralph Loop
  const pixelComplete = await checkAgentCompletion(ideaId, 'pixel');
  if (!pixelComplete) {
    log('Spawning Pixel with Ralph Loop...');
    await spawnAgent('pixel', ideaId, ideaData);
    log('Pixel spawned. Will check again in next run.');
    return;
  }

  // Spawn Echo
  const echoComplete = await checkAgentCompletion(ideaId, 'echo');
  if (!echoComplete) {
    log('Spawning Echo...');
    await spawnAgent('echo', ideaId, ideaData);
    log('Echo spawned. Will check again in next run.');
    return;
  }

  // All agents complete - now run integrator
  log('All agents complete! Running integrator...');
  
  const integratorComplete = await checkAgentCompletion(ideaId, 'integrator');
  if (!integratorComplete) {
    log('Spawning Integrator...');
    await spawnIntegrator(ideaId, ideaData);
    log('Integrator spawned. Will check again in next run.');
    return;
  }

  // All agents complete - capture and push screenshot
  log('Integrator complete! Capturing screenshot...');
  const buildPath = path.join(BUILDS_DIR, ideaId);
  await captureAndPushScreenshot(buildPath, ideaData);

  // Update tracker status
  const trackerPath = path.join(BUILDS_DIR, `${ideaId}.json`);
  const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
  tracker.agents.pixel = 'complete';
  tracker.agents.echo = 'complete';
  tracker.agents.integrator = 'complete';
  tracker.status = 'ready_for_deployment';
  fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));

  log(`Build orchestration complete for ${ideaId}`);
}

async function main() {
  const ideaId = process.argv[2];

  if (!ideaId) {
    console.log('Usage: node build-orchestrator.js <idea-id>');
    console.log('');
    console.log('Example:');
    console.log('  node build-orchestrator.js k17f2rm2h9g5dnecvwvscc7aj581yrm1');
    process.exit(1);
  }

  await orchestrateBuild(ideaId);
}

main().catch(err => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
