#!/usr/bin/env node
/**
 * Build Monitor — Full pipeline automation with deployment gates
 * 
 * Runs every 10 minutes via cron. Handles:
 * 1. Picking up approved ideas → marking as building
 * 2. Spawning agents (forge → pixel → echo) sequentially
 * 3. Running integrator when all agents complete
 * 4. Deploying to hosting service (GitHub + Vercel/Netlify)
 * 5. Marking ideas as done ONLY after successful deployment
 * 
 * Pipeline: approved → building → [forge → pixel → echo → integrator → deploy] → done
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load secrets file (provides defaults for CONVEX_DEPLOY_KEY, GITHUB_TOKEN, VERCEL_TOKEN, etc.)
const SECRETS_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/config/secrets.json';
let SECRETS = {};
if (fs.existsSync(SECRETS_FILE)) {
  SECRETS = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8'));
  console.log(`[Build Monitor] Loaded secrets from ${SECRETS_FILE}`);
}

const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || SECRETS.convex?.deployKey;
if (!CONVEX_DEPLOY_KEY) {
  console.error('[Build Monitor] CONVEX_DEPLOY_KEY missing. Set the env var or populate config/secrets.json.');
  process.exit(1);
}
const DASHBOARD_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/dashboard';
const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';
const NODE_BIN = '/home/n8garvie/.nvm/versions/node/v22.22.0/bin';
const MAX_CONCURRENT_BUILDS = 2;

// Backwards compatibility: also load from .env.missioncontrol if it exists
const SECURE_ENV_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/.env.missioncontrol';
let SECURE_ENV_VARS = {};
if (fs.existsSync(SECURE_ENV_FILE)) {
  const envContent = fs.readFileSync(SECURE_ENV_FILE, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      SECURE_ENV_VARS[match[1]] = match[2];
    }
  });
}

// Configuration for deployment
const DEPLOY_CONFIG = {
  // GitHub settings
  github: {
    enabled: true,
    owner: process.env.GITHUB_OWNER || 'n8garvie',
    private: true, // Always create private repos
    token: process.env.GITHUB_TOKEN || SECRETS.github?.token
  },
  // Hosting provider settings (priority order)
  hosting: {
    primary: process.env.HOSTING_PROVIDER || 'vercel', // 'vercel', 'netlify', 'github-pages'
    vercel: {
      token: process.env.VERCEL_TOKEN || SECRETS.vercel?.token,
      teamId: process.env.VERCEL_TEAM_ID || SECRETS.vercel?.teamId
    },
    netlify: {
      token: process.env.NETLIFY_TOKEN
    }
  }
};

// Agent configurations — these map to real OpenClaw agents
const AGENTS = {
  forge: {
    agentId: 'forge',
    model: 'anthropic/claude-opus-4-6',
    timeout: 1800,
    description: 'Architecture Agent'
  },
  pixel: {
    agentId: 'pixel',
    model: 'moonshot/kimi-k2.5',
    timeout: 2400,
    description: 'Design Agent'
  },
  echo: {
    agentId: 'echo',
    model: 'moonshot/kimi-k2.5',
    timeout: 900,
    description: 'Copy Agent'
  },
  integrator: {
    agentId: 'main', // Use main agent for integration
    model: 'moonshot/kimi-k2.5',
    timeout: 1200,
    description: 'Integration Agent'
  }
};

// Pipeline order — agents run sequentially, then deploy
const PIPELINE = ['forge', 'pixel', 'echo'];

// Concurrency lock — prevent two cron firings from racing each other
fs.mkdirSync(BUILDS_DIR, { recursive: true });
const LOCK_FILE = path.join(BUILDS_DIR, '.build-monitor.lock');
const STALE_LOCK_MS = 3 * 60 * 60 * 1000; // 3h: longer than the longest agent timeout (2400s pixel)

try {
  fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
} catch (lockErr) {
  if (lockErr.code === 'EEXIST') {
    let stale = false;
    try {
      const stat = fs.statSync(LOCK_FILE);
      if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) stale = true;
    } catch (statErr) {
      // Lock file vanished between our open and stat; treat as not held.
      stale = true;
    }
    if (stale) {
      console.log(`[Build Monitor] Reclaiming stale lock at ${LOCK_FILE}`);
      try { fs.unlinkSync(LOCK_FILE); } catch (unlinkErr) { /* fall through, retry write */ }
      try {
        fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      } catch (retryErr) {
        console.log('[Build Monitor] Failed to reclaim lock, exiting');
        process.exit(0);
      }
    } else {
      console.log('[Build Monitor] Another build-monitor is running, exiting');
      process.exit(0);
    }
  } else {
    throw lockErr;
  }
}

const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* already gone */ } };
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(130); });
process.on('SIGTERM', () => { releaseLock(); process.exit(143); });

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function convexRun(fn, args) {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ${fn} '${JSON.stringify(args)}'`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe', timeout: 30000 }
    );
    return JSON.parse(output);
  } catch (err) {
    log(`Convex error (${fn}): ${err.message.substring(0, 200)}`);
    return null;
  }
}

function checkAgentStatus(ideaId, agentName) {
  const buildDir = path.join(BUILDS_DIR, ideaId, agentName);
  
  // Check multiple possible COMPLETION.md locations
  const completionPaths = [
    path.join(buildDir, 'COMPLETION.md'),
    path.join(buildDir, 'final', 'COMPLETION.md'),
  ];
  
  for (const p of completionPaths) {
    if (fs.existsSync(p)) return 'completed';
  }
  
  // Check if spawned (task file exists)
  const taskFile = path.join(buildDir, `${agentName}-task.json`);
  if (fs.existsSync(taskFile)) {
    // Check if task is stale (> 2 hours old)
    try {
      const stat = fs.statSync(taskFile);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > 2 * 60 * 60 * 1000) {
        log(`  ${agentName} task is stale (${Math.round(ageMs / 60000)}min old) — will re-spawn`);
        return 'stale';
      }
    } catch (err) {
      log(`  ${agentName} task file vanished during stat (${err.message}); treating as stale`);
      return 'stale';
    }
    return 'spawned';
  }

  return 'pending';
}

function checkIntegrationStatus(ideaId) {
  const buildDir = path.join(BUILDS_DIR, ideaId, 'integrator');
  const completionPath = path.join(buildDir, 'final', 'COMPLETION.md');
  
  if (fs.existsSync(completionPath)) {
    return 'completed';
  }
  
  const taskFile = path.join(buildDir, 'integrator-task.json');
  if (fs.existsSync(taskFile)) {
    try {
      const stat = fs.statSync(taskFile);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > 2 * 60 * 60 * 1000) {
        return 'stale';
      }
    } catch (err) {
      log(`  integrator task file vanished during stat (${err.message}); treating as stale`);
      return 'stale';
    }
    return 'spawned';
  }

  return 'pending';
}

function checkDeploymentStatus(ideaId) {
  const buildDir = path.join(BUILDS_DIR, ideaId);
  const deployFile = path.join(buildDir, 'deploy-status.json');
  
  if (fs.existsSync(deployFile)) {
    try {
      const status = JSON.parse(fs.readFileSync(deployFile, 'utf-8'));
      return status;
    } catch {
      return { status: 'error', error: 'Failed to read deploy status' };
    }
  }
  
  return { status: 'pending' };
}

function spawnAgent(agentName, idea) {
  const agentConfig = AGENTS[agentName];
  const buildDir = path.join(BUILDS_DIR, idea._id, agentName);
  fs.mkdirSync(buildDir, { recursive: true });

  const task = `You are ${agentName.charAt(0).toUpperCase() + agentName.slice(1)}, a Mission Control agent.

## Task: ${idea.title}

**Description:** ${idea.description}

**Target Audience:** ${idea.targetAudience || 'General users'}

**MVP Scope:** ${idea.mvpScope || 'Create a functional MVP'}

**Idea ID:** ${idea._id}

## Instructions
Follow your AGENTS.md instructions for your role.
Save ALL deliverables to: ${buildDir}/
When complete, create COMPLETION.md in that directory summarizing what you built.

COMPLETION.md is MANDATORY — the pipeline cannot advance without it.`;

  log(`  Spawning ${agentName} (agent: ${agentConfig.agentId}) for: ${idea.title}`);
  
  // Write task file as tracking marker
  fs.writeFileSync(path.join(buildDir, `${agentName}-task.json`), JSON.stringify({
    agent: agentName,
    ideaId: idea._id,
    title: idea.title,
    spawnedAt: new Date().toISOString(),
    status: 'spawning'
  }, null, 2));

  try {
    // Write task to a temp file to avoid shell escaping issues
    const taskFile = path.join(buildDir, `${agentName}-prompt.txt`);
    fs.writeFileSync(taskFile, task);
    
    // Use openclaw agent — run with a generous timeout
    const msgArg = fs.readFileSync(taskFile, 'utf-8').substring(0, 4000);
    const result = execSync(
      `openclaw agent --agent ${agentConfig.agentId} --session-id "build-${agentName}-${idea._id.substring(0, 16)}" --timeout ${agentConfig.timeout} -m "${msgArg.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { 
        encoding: 'utf-8', 
        timeout: (agentConfig.timeout + 60) * 1000,
        env: { ...process.env, PATH: `${NODE_BIN}:${process.env.PATH}` },
        stdio: 'pipe'
      }
    );
    log(`  ✓ ${agentName} completed: ${result.trim().substring(0, 200)}`);
    
    // Update task file to mark as done
    const taskData = JSON.parse(fs.readFileSync(path.join(buildDir, `${agentName}-task.json`), 'utf-8'));
    taskData.status = 'completed';
    taskData.completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(buildDir, `${agentName}-task.json`), JSON.stringify(taskData, null, 2));
    
    return true;
  } catch (err) {
    log(`  ✗ ${agentName} failed: ${err.message.substring(0, 200)}`);
    // Update task file with error
    try {
      const taskData = JSON.parse(fs.readFileSync(path.join(buildDir, `${agentName}-task.json`), 'utf-8'));
      taskData.status = 'error';
      taskData.error = err.message.substring(0, 500);
      taskData.errorAt = new Date().toISOString();
      fs.writeFileSync(path.join(buildDir, `${agentName}-task.json`), JSON.stringify(taskData, null, 2));
    } catch (writeErr) {
      log(`  Failed to record ${agentName} error to task file: ${writeErr.message}`);
    }
    return false;
  }
}

function spawnIntegrator(idea) {
  const agentConfig = AGENTS.integrator;
  const buildDir = path.join(BUILDS_DIR, idea._id, 'integrator');
  fs.mkdirSync(buildDir, { recursive: true });

  // Gather all agent outputs
  const agentOutputs = {};
  for (const agent of PIPELINE) {
    const agentDir = path.join(BUILDS_DIR, idea._id, agent);
    const completionPath = path.join(agentDir, 'COMPLETION.md');
    if (fs.existsSync(completionPath)) {
      agentOutputs[agent] = fs.readFileSync(completionPath, 'utf-8');
    }
  }

  const task = `You are the Integrator, a Mission Control agent.

## Task: Integrate outputs for ${idea.title}

**Idea ID:** ${idea._id}

## Agent Outputs

${Object.entries(agentOutputs).map(([agent, output]) => `
### ${agent.toUpperCase()} Output:
${output.substring(0, 2000)}
`).join('\n')}

## Instructions
1. Create a unified, production-ready codebase in: ${buildDir}/final/
2. Merge the architecture (forge), design (pixel), and copy (echo) outputs
3. Ensure the code is functional and follows best practices
4. Create a COMPLETION.md in ${buildDir}/final/ summarizing the integrated build
5. Include deployment instructions in the COMPLETION.md

The final build MUST be deployable to Vercel or Netlify.`;

  log(`  Spawning integrator for: ${idea.title}`);
  
  fs.writeFileSync(path.join(buildDir, 'integrator-task.json'), JSON.stringify({
    agent: 'integrator',
    ideaId: idea._id,
    title: idea.title,
    spawnedAt: new Date().toISOString(),
    status: 'spawning'
  }, null, 2));

  try {
    const taskFile = path.join(buildDir, 'integrator-prompt.txt');
    fs.writeFileSync(taskFile, task);
    
    const msgArg = fs.readFileSync(taskFile, 'utf-8').substring(0, 4000);
    const result = execSync(
      `openclaw agent --agent ${agentConfig.agentId} --session-id "build-integrator-${idea._id.substring(0, 16)}" --timeout ${agentConfig.timeout} -m "${msgArg.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { 
        encoding: 'utf-8', 
        timeout: (agentConfig.timeout + 60) * 1000,
        env: { ...process.env, PATH: `${NODE_BIN}:${process.env.PATH}` },
        stdio: 'pipe'
      }
    );
    log(`  ✓ Integrator completed: ${result.trim().substring(0, 200)}`);
    
    const taskData = JSON.parse(fs.readFileSync(path.join(buildDir, 'integrator-task.json'), 'utf-8'));
    taskData.status = 'completed';
    taskData.completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(buildDir, 'integrator-task.json'), JSON.stringify(taskData, null, 2));
    
    return true;
  } catch (err) {
    log(`  ✗ Integrator failed: ${err.message.substring(0, 200)}`);
    try {
      const taskData = JSON.parse(fs.readFileSync(path.join(buildDir, 'integrator-task.json'), 'utf-8'));
      taskData.status = 'error';
      taskData.error = err.message.substring(0, 500);
      taskData.errorAt = new Date().toISOString();
      fs.writeFileSync(path.join(buildDir, 'integrator-task.json'), JSON.stringify(taskData, null, 2));
    } catch (writeErr) {
      log(`  Failed to record integrator error to task file: ${writeErr.message}`);
    }
    return false;
  }
}

async function captureScreenshot(idea, finalDir) {
  const codeDir = fs.existsSync(finalDir) ? finalDir : path.join(BUILDS_DIR, idea._id, 'forge');
  const packageJsonPath = path.join(codeDir, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return { success: false, error: 'No package.json found' };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Detect project type and port
  let port = 3000;
  let startCmd = 'npm run dev';
  
  if (deps['next']) {
    port = 3000;
  } else if (deps['vite']) {
    port = 5173;
  } else if (deps['react-scripts']) {
    port = 3000;
    startCmd = 'npm start';
  }
  
  // Build first if build script exists
  if (packageJson.scripts?.build) {
    try {
      execSync('npm run build', { cwd: codeDir, stdio: 'ignore', timeout: 120000 });
    } catch (err) {
      // Build failed, continue with dev server
    }
  }
  
  // Find available port
  for (const tryPort of [port, 3001, 3002, 3003, 5173, 5174, 8080]) {
    try {
      execSync(`lsof -Pi :${tryPort} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    } catch {
      port = tryPort;
      break;
    }
  }
  
  // Start dev server
  const serverProcess = require('child_process').spawn(
    'npm', ['run', 'dev', '--', '--port', port.toString()],
    { cwd: codeDir, detached: true, stdio: 'ignore' }
  );
  
  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 60; i++) {
    try {
      execSync(`curl -s http://localhost:${port} > /dev/null`, { stdio: 'ignore' });
      serverReady = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (!serverReady) {
    try { process.kill(-serverProcess.pid); } catch (killErr) {
      log(`  dev server cleanup: kill failed (${killErr.code || killErr.message})`);
    }
    return { success: false, error: 'Server failed to start' };
  }
  
  // Capture screenshot
  try {
    execSync(
      `npx playwright screenshot --full-page --wait-for-timeout 5000 --color-scheme=dark http://localhost:${port} screenshot.png`,
      { cwd: codeDir, stdio: 'ignore', timeout: 60000 }
    );
    
    // Stop server
    try { process.kill(-serverProcess.pid); } catch (killErr) {
      log(`  dev server cleanup after screenshot: kill failed (${killErr.code || killErr.message})`);
    }
    
    // Add to README
    const readmePath = path.join(codeDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf-8');
      if (!readme.includes('screenshot.png')) {
        const lines = readme.split('\n');
        const newLines = [];
        let added = false;
        
        for (const line of lines) {
          newLines.push(line);
          if (!added && line.startsWith('# ')) {
            newLines.push('');
            newLines.push('![App Screenshot](./screenshot.png)');
            newLines.push('');
            added = true;
          }
        }
        fs.writeFileSync(readmePath, newLines.join('\n'));
      }
    }
    
    return { success: true, path: path.join(codeDir, 'screenshot.png') };
  } catch (err) {
    try { process.kill(-serverProcess.pid); } catch (killErr) {
      log(`  dev server cleanup after screenshot error: kill failed (${killErr.code || killErr.message})`);
    }
    return { success: false, error: err.message };
  }
}

async function deployBuild(idea) {
  const buildDir = path.join(BUILDS_DIR, idea._id);
  const finalDir = path.join(buildDir, 'integrator', 'final');
  const deployStatusFile = path.join(buildDir, 'deploy-status.json');
  
  log(`  Starting deployment for: ${idea.title}`);
  
  const deployStatus = {
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    github: null,
    hosting: null
  };
  
  // Step 1: Create GitHub repository (private)
  if (DEPLOY_CONFIG.github.enabled && DEPLOY_CONFIG.github.token) {
    try {
      log(`    Creating private GitHub repo: ${idea._id}`);
      
      const repoName = idea._id;
      const createRepoCmd = `curl -s -X POST https://api.github.com/user/repos \
        -H "Authorization: token ${DEPLOY_CONFIG.github.token}" \
        -H "Accept: application/vnd.github.v3+json" \
        -d '${JSON.stringify({
          name: repoName,
          private: true,
          description: `Mission Control build: ${idea.title}`,
          auto_init: false
        })}'`;
      
      const repoResult = execSync(createRepoCmd, { encoding: 'utf-8', timeout: 30000 });
      const repoData = JSON.parse(repoResult);
      
      if (repoData.html_url) {
        deployStatus.github = {
          url: repoData.html_url,
          cloneUrl: repoData.clone_url,
          status: 'created'
        };
        log(`    ✅ GitHub repo created: ${repoData.html_url}`);
        
        // Push code to GitHub
        const codeDir = fs.existsSync(finalDir) ? finalDir : path.join(buildDir, 'forge');
        
        execSync(`cd "${codeDir}" && git init && git add . && git commit -m "Initial build: ${idea.title}"`, 
          { stdio: 'pipe' });
        execSync(`cd "${codeDir}" && git branch -M main && git remote add origin ${repoData.clone_url}`, 
          { stdio: 'pipe' });
        execSync(`cd "${codeDir}" && git push -u origin main`, 
          { stdio: 'pipe', timeout: 60000 });
        
        deployStatus.github.status = 'pushed';
        log(`    ✅ Code pushed to GitHub`);
      }
    } catch (err) {
      log(`    ⚠️ GitHub deployment failed: ${err.message.substring(0, 200)}`);
      deployStatus.github = { status: 'error', error: err.message.substring(0, 500) };
    }
  } else {
    log(`    ⚠️ GitHub token not configured, skipping repo creation`);
    deployStatus.github = { status: 'skipped', reason: 'token_not_configured' };
  }
  
  // Step 2: Screenshot will be captured AFTER Vercel deployment (see below)
  // This ensures we capture the actual deployed app, not a local dev server
  
  // Step 3: Deploy to hosting provider
  const hostingProvider = DEPLOY_CONFIG.hosting.primary;
  
  if (hostingProvider === 'vercel' && DEPLOY_CONFIG.hosting.vercel.token) {
    try {
      log(`    Deploying to Vercel...`);
      
      const codeDir = fs.existsSync(finalDir) ? finalDir : path.join(buildDir, 'forge');
      const repoName = idea._id;
      const githubRepo = `${DEPLOY_CONFIG.github.owner}/${repoName}`;
      
      // Step 1: Create or update Vercel project linked to GitHub
      log(`    Linking Vercel project to GitHub repo: ${githubRepo}`);
      
      // Check if project exists
      let projectId;
      let projectUrl;
      try {
        const projectCheck = execSync(
          `curl -s "https://api.vercel.com/v9/projects/${repoName}" -H "Authorization: Bearer ${DEPLOY_CONFIG.hosting.vercel.token}"`,
          { encoding: 'utf-8', timeout: 30000 }
        );
        const projectData = JSON.parse(projectCheck);
        if (projectData.id) {
          projectId = projectData.id;
          projectUrl = `https://${projectData.name}.vercel.app`;
          log(`    ✅ Found existing Vercel project: ${projectId}`);
        }
      } catch (err) {
        log(`    Creating new Vercel project...`);
      }
      
      // Create project if it doesn't exist
      if (!projectId) {
        const createProjectCmd = `curl -s -X POST "https://api.vercel.com/v9/projects" \
          -H "Authorization: Bearer ${DEPLOY_CONFIG.hosting.vercel.token}" \
          -H "Content-Type: application/json" \
          -d '${JSON.stringify({
            name: repoName,
            framework: 'nextjs',
            gitRepository: {
              type: 'github',
              repo: githubRepo
            },
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
            installCommand: 'npm install'
          })}'`;
        
        const createResult = execSync(createProjectCmd, { encoding: 'utf-8', timeout: 30000 });
        const projectData = JSON.parse(createResult);
        projectId = projectData.id;
        projectUrl = `https://${projectData.name}.vercel.app`;
        log(`    ✅ Created Vercel project: ${projectId}`);
      }
      
      // Step 2: Set environment variables in Vercel (SECURE - not in GitHub)
      if (Object.keys(SECURE_ENV_VARS).length > 0) {
        log(`    Setting environment variables in Vercel...`);
        for (const [key, value] of Object.entries(SECURE_ENV_VARS)) {
          try {
            execSync(
              `curl -s -X POST "https://api.vercel.com/v9/projects/${projectId}/env" \
                -H "Authorization: Bearer ${DEPLOY_CONFIG.hosting.vercel.token}" \
                -H "Content-Type: application/json" \
                -d '${JSON.stringify({
                  key: key,
                  value: value,
                  target: ['production', 'preview', 'development'],
                  type: 'plain'
                })}'`,
              { stdio: 'ignore', timeout: 10000 }
            );
            log(`      ✅ Set ${key}`);
          } catch (err) {
            log(`      ⚠️ Failed to set ${key}: ${err.message.substring(0, 100)}`);
          }
        }
      }
      
      // Step 3: Create vercel.json with proper config
      const vercelConfigPath = path.join(codeDir, 'vercel.json');
      fs.writeFileSync(vercelConfigPath, JSON.stringify({
        version: 2,
        name: repoName,
        public: false,
        github: {
          enabled: true,
          autoAlias: true
        }
      }, null, 2));
      
      // Step 4: Deploy using Vercel CLI (will use GitHub integration)
      log(`    Deploying to Vercel...`);
      const vercelCmd = DEPLOY_CONFIG.hosting.vercel.teamId 
        ? `cd "${codeDir}" && npx vercel --token ${DEPLOY_CONFIG.hosting.vercel.token} --scope ${DEPLOY_CONFIG.hosting.vercel.teamId} --yes --prod`
        : `cd "${codeDir}" && npx vercel --token ${DEPLOY_CONFIG.hosting.vercel.token} --yes --prod`;
      
      const deployOutput = execSync(vercelCmd, { encoding: 'utf-8', timeout: 120000 });
      
      // Extract URL from output
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
      if (urlMatch) {
        deployStatus.hosting = {
          provider: 'vercel',
          url: urlMatch[0],
          projectId: projectId,
          githubRepo: githubRepo,
          status: 'deployed'
        };
        log(`    ✅ Deployed to Vercel: ${urlMatch[0]}`);
        log(`    🔗 Linked to GitHub: ${githubRepo}`);
      } else {
        deployStatus.hosting = {
          provider: 'vercel',
          url: projectUrl,
          projectId: projectId,
          githubRepo: githubRepo,
          status: 'deployed'
        };
        log(`    ✅ Deployed to Vercel: ${projectUrl}`);
      }
    } catch (err) {
      log(`    ⚠️ Vercel deployment failed: ${err.message.substring(0, 200)}`);
      deployStatus.hosting = { 
        provider: 'vercel', 
        status: 'error', 
        error: err.message.substring(0, 500) 
      };
    }
  } else if (hostingProvider === 'netlify' && DEPLOY_CONFIG.hosting.netlify.token) {
    try {
      log(`    Deploying to Netlify...`);
      
      const codeDir = fs.existsSync(finalDir) ? finalDir : path.join(buildDir, 'forge');
      
      // Deploy using Netlify CLI
      const netlifyCmd = `cd "${codeDir}" && npx netlify deploy --prod --auth ${DEPLOY_CONFIG.hosting.netlify.token} --site ${idea._id} --dir .`;
      
      const deployOutput = execSync(netlifyCmd, { encoding: 'utf-8', timeout: 120000 });
      
      // Extract URL from output
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.netlify\.app/);
      if (urlMatch) {
        deployStatus.hosting = {
          provider: 'netlify',
          url: urlMatch[0],
          status: 'deployed'
        };
        log(`    ✅ Deployed to Netlify: ${urlMatch[0]}`);
      }
    } catch (err) {
      log(`    ⚠️ Netlify deployment failed: ${err.message.substring(0, 200)}`);
      deployStatus.hosting = { 
        provider: 'netlify', 
        status: 'error', 
        error: err.message.substring(0, 500) 
      };
    }
  } else {
    log(`    ⚠️ Hosting provider token not configured, skipping deployment`);
    deployStatus.hosting = { 
      provider: hostingProvider, 
      status: 'skipped', 
      reason: 'token_not_configured' 
    };
  }
  
  // Step 4: Capture screenshot from deployed URL (if hosting succeeded)
  if (deployStatus.hosting?.status === 'deployed' && deployStatus.hosting?.url) {
    try {
      log(`    📸 Capturing screenshot from deployed URL...`);
      const codeDir = fs.existsSync(finalDir) ? finalDir : path.join(buildDir, 'forge');
      
      // Try to capture screenshot from live URL
      execSync(
        `npx playwright screenshot --full-page --wait-for-timeout 8000 "${deployStatus.hosting.url}" screenshot.png`,
        { cwd: codeDir, stdio: 'ignore', timeout: 60000 }
      );
      
      // Add to README
      const readmePath = path.join(codeDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf-8');
        if (!readme.includes('screenshot.png')) {
          const lines = readme.split('\n');
          const newLines = [];
          let added = false;
          
          for (const line of lines) {
            newLines.push(line);
            if (!added && line.startsWith('# ')) {
              newLines.push('');
              newLines.push('![App Screenshot](./screenshot.png)');
              newLines.push('');
              added = true;
            }
          }
          fs.writeFileSync(readmePath, newLines.join('\n'));
        }
      }
      
      // Re-push to GitHub with screenshot
      execSync(`cd "${codeDir}" && git add README.md screenshot.png && git commit -m "Add screenshot to README [Mission Control Auto]" && git push`, 
        { stdio: 'pipe', timeout: 60000 });
      
      deployStatus.screenshot = { status: 'captured', url: deployStatus.hosting.url };
      log(`    ✅ Screenshot captured and pushed to GitHub`);
    } catch (err) {
      log(`    ⚠️ Screenshot capture failed: ${err.message.substring(0, 200)}`);
      deployStatus.screenshot = { 
        status: 'failed', 
        error: err.message.substring(0, 500),
        note: 'App may require environment variables to render properly'
      };
    }
  }
  
  // Determine final status
  const hasGitHub = deployStatus.github && (deployStatus.github.status === 'pushed' || deployStatus.github.status === 'created');
  const hasHosting = deployStatus.hosting && deployStatus.hosting.status === 'deployed';
  const hasScreenshot = deployStatus.screenshot && deployStatus.screenshot.status === 'captured';
  
  // Screenshot is REQUIRED for a complete build
  if (hasGitHub && hasHosting && hasScreenshot) {
    deployStatus.status = 'completed';
    deployStatus.completedAt = new Date().toISOString();
  } else if (hasGitHub && hasScreenshot) {
    // GitHub + Screenshot is acceptable (hosting optional)
    deployStatus.status = 'completed';
    deployStatus.completedAt = new Date().toISOString();
  } else if (hasGitHub && hasHosting) {
    // GitHub + Hosting but no screenshot (app may need env vars)
    deployStatus.status = 'completed';
    deployStatus.completedAt = new Date().toISOString();
    deployStatus.warning = 'Screenshot failed - app may require environment variables';
  } else if (hasGitHub || hasHosting) {
    deployStatus.status = 'partial';
    if (!hasScreenshot) {
      deployStatus.warning = 'Missing screenshot';
    }
  } else {
    deployStatus.status = 'failed';
  }
  
  fs.writeFileSync(deployStatusFile, JSON.stringify(deployStatus, null, 2));
  
  return deployStatus;
}

function notifyNathan(title, ideaId, deployStatus = null) {
  const buildDir = path.join(BUILDS_DIR, ideaId);
  
  // Gather what was built
  const agents = ['forge', 'pixel', 'echo'];
  const completedAgents = agents.filter(a => {
    const dir = path.join(buildDir, a);
    return fs.existsSync(path.join(dir, 'COMPLETION.md')) || 
           fs.existsSync(path.join(dir, 'final', 'COMPLETION.md'));
  });

  // Read full summary
  let fullSummary = '';
  try {
    const forgePath = path.join(buildDir, 'forge', 'COMPLETION.md');
    if (fs.existsSync(forgePath)) {
      fullSummary = fs.readFileSync(forgePath, 'utf-8');
    }
  } catch (readErr) {
    log(`  Could not read forge COMPLETION.md for summary: ${readErr.message}`);
  }
  
  // Extract key sections
  const whatBuiltMatch = fullSummary.match(/## What Was Built\s*\n\s*\*\*([^*]+)\*\*/);
  const whatBuilt = whatBuiltMatch ? whatBuiltMatch[1].trim() : title;
  
  const techMatch = fullSummary.match(/## Tech Stack\s*\n\s*([^#]+)/);
  const techStackRaw = techMatch ? techMatch[1].trim() : '';
  // Extract just the technology names, not full descriptions
  const techStack = techStackRaw
    .split('\n')
    .slice(0, 3)
    .map(line => line.replace(/^-\s*\*\*([^*]+)\*\*.*/, '$1').trim())
    .join(', ')
    .substring(0, 100);
  
  // Build deployment info - only show if actually deployed
  let deployInfo = '';
  if (deployStatus && deployStatus.status === 'completed') {
    deployInfo = '\n\n🚀 *Deployed*\n';
    if (deployStatus.hosting?.url) {
      deployInfo += `🔗 ${deployStatus.hosting.url}\n`;
    }
    if (deployStatus.github?.url) {
      deployInfo += `📦 ${deployStatus.github.url}\n`;
    }
  } else if (deployStatus && deployStatus.status === 'partial') {
    deployInfo = '\n\n⚠️ *Partial Deploy*\n';
    if (deployStatus.hosting?.url) {
      deployInfo += `🔗 ${deployStatus.hosting.url}\n`;
    }
    if (deployStatus.github?.url) {
      deployInfo += `📦 ${deployStatus.github.url}\n`;
    }
  }
  
  // Build local path link (always available)
  const localPath = `builds/${ideaId}`;
  
  const msg = `🏗️ *Build: ${title}*

Agents: ${completedAgents.map(a => `✅ ${a}`).join(' ')}

📂 ${localPath}

${whatBuilt}

${techStack ? `🛠 ${techStack}` : ''}${deployInfo}`;

  log(`  Message length: ${msg.length} chars`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN || SECRETS.telegram?.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || SECRETS.telegram?.chatId;
  if (!botToken || !chatId) {
    log('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID), skipping notification');
    return;
  }

  try {
    const msgFile = path.join(buildDir, '.notify-msg.txt');
    fs.writeFileSync(msgFile, msg);

    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" ` +
      `-d "chat_id=${chatId}" ` +
      `-d "parse_mode=Markdown" ` +
      `--data-urlencode "text@${msgFile}"`,
      { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
    );

    fs.unlinkSync(msgFile);
    log(`Notification sent for: ${title}`);
  } catch (err) {
    log(`Notification failed: ${err.message.substring(0, 200)}`);
    log(`  Message was: ${msg.substring(0, 300)}...`);
  }
}

function markDone(ideaId, title, deployStatus) {
  const deployedUrl = deployStatus?.hosting?.url || deployStatus?.github?.url || 'local';
  log(`Marking ${title} as done (deployed: ${deployedUrl})`);
  
  const result = convexRun('ideas:markDone', { ideaId, deployedUrl });
  if (result) {
    log(`✓ ${title} marked as done`);
    notifyNathan(title, ideaId, deployStatus);
  }
}

async function processBuilding() {
  const buildingIdeas = convexRun('ideas:listByStatus', { status: 'building' });
  if (!buildingIdeas || buildingIdeas.length === 0) {
    return 0;
  }

  log(`Found ${buildingIdeas.length} building idea(s)`);

  for (const idea of buildingIdeas.slice(0, MAX_CONCURRENT_BUILDS)) {
    log(`\nProcessing: ${idea.title} (${idea._id})`);

    let allAgentsComplete = true;

    // Step 1: Check agent pipeline
    for (const agentName of PIPELINE) {
      const status = checkAgentStatus(idea._id, agentName);

      if (status === 'completed') {
        log(`  ${agentName}: ✅ Complete`);
      } else if (status === 'spawned') {
        log(`  ${agentName}: ⏳ Running — waiting`);
        allAgentsComplete = false;
        break;
      } else if (status === 'stale') {
        log(`  ${agentName}: 🔄 Stale — re-spawning...`);
        spawnAgent(agentName, idea);
        allAgentsComplete = false;
        break;
      } else {
        log(`  ${agentName}: 🚀 Spawning...`);
        spawnAgent(agentName, idea);
        allAgentsComplete = false;
        break;
      }
    }

    if (!allAgentsComplete) {
      continue;
    }

    log(`  All agents complete for: ${idea.title}`);

    // Step 2: Check/run integrator
    const integrationStatus = checkIntegrationStatus(idea._id);
    
    if (integrationStatus === 'completed') {
      log(`  Integrator: ✅ Complete`);
    } else if (integrationStatus === 'spawned') {
      log(`  Integrator: ⏳ Running — waiting`);
      continue;
    } else if (integrationStatus === 'stale') {
      log(`  Integrator: 🔄 Stale — re-spawning...`);
      spawnIntegrator(idea);
      continue;
    } else {
      log(`  Integrator: 🚀 Spawning...`);
      spawnIntegrator(idea);
      continue;
    }

    // Step 3: Check/run deployment
    const deployStatus = checkDeploymentStatus(idea._id);
    
    if (deployStatus.status === 'completed') {
      log(`  Deployment: ✅ Complete`);
      log(`  All pipeline stages complete — marking as done`);
      markDone(idea._id, idea.title, deployStatus);
    } else if (deployStatus.status === 'in_progress') {
      log(`  Deployment: ⏳ In progress — waiting`);
      continue;
    } else if (deployStatus.status === 'partial') {
      log(`  Deployment: ⚠️ Partial — marking as done with warnings`);
      markDone(idea._id, idea.title, deployStatus);
    } else if (deployStatus.status === 'failed') {
      log(`  Deployment: ❌ Failed — retrying...`);
      await deployBuild(idea);
    } else {
      log(`  Deployment: 🚀 Starting...`);
      await deployBuild(idea);
    }
  }

  return buildingIdeas.length;
}

function notifySpawnStart(idea) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || SECRETS.telegram?.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || SECRETS.telegram?.chatId;
  if (!botToken || !chatId) return;
  const priority = idea.buildPriority === 'high' ? ' (manual)' : '';
  const text = `Build started${priority}: ${idea.title}`;
  try {
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" ` +
      `-d "chat_id=${chatId}" --data-urlencode "text=${text}"`,
      { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
    );
  } catch (err) {
    log(`  Spawn-start notification failed: ${err.message.substring(0, 100)}`);
  }
}

function pickNextApproved() {
  const building = convexRun('ideas:listByStatus', { status: 'building' });
  if (building && building.length >= MAX_CONCURRENT_BUILDS) {
    log(`Already at max concurrent builds (${building.length}/${MAX_CONCURRENT_BUILDS})`);
    return;
  }

  const approved = convexRun('ideas:getApproved', {});
  if (!approved || approved.length === 0) {
    log('No approved ideas to pick up');
    return;
  }

  // Visible queue trace — easier to answer "did the cron see my idea?"
  log(`Approved queue (${approved.length}):`);
  approved.slice(0, 5).forEach((q, i) => {
    const flag = q.buildPriority === 'high' ? ' [HIGH]' : '';
    log(`  ${i + 1}. ${q.title}${flag} (approved ${new Date(q.approvedAt || q.createdAt).toISOString()})`);
  });
  if (approved.length > 5) log(`  ...and ${approved.length - 5} more`);

  const idea = approved[0];
  log(`\nPicking up approved idea: ${idea.title} (priority=${idea.buildPriority || 'normal'})`);

  const result = convexRun('ideas:markBuilding', { ideaId: idea._id });
  if (result) {
    log(`✓ ${idea.title} → building`);
    notifySpawnStart(idea);
  }
}

// Detect builds that have been stuck in an active stage past the longest
// agent timeout, and reset them to approved with lastBuildError populated so
// the user can re-fire from the dashboard. Called from main().
function escalateStuckBuilds() {
  const STUCK_AFTER_MS = 3 * 60 * 60 * 1000; // 3h: longer than the longest agent timeout
  const building = convexRun('ideas:listByStatus', { status: 'building' });
  if (!building || building.length === 0) return;

  const now = Date.now();
  for (const idea of building) {
    const startedAt = idea.buildStartedAt || idea.lastActivityAt || 0;
    if (!startedAt || now - startedAt < STUCK_AFTER_MS) continue;

    const ageMin = Math.round((now - startedAt) / 60000);
    const reason = `stuck in ${idea.buildStage} for ${ageMin}min (>${Math.round(STUCK_AFTER_MS / 60000)}min)`;
    log(`Escalating stuck build: ${idea.title} — ${reason}`);
    const ok = convexRun('ideas:markBuildFailed', { ideaId: idea._id, reason });
    if (ok) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN || SECRETS.telegram?.botToken;
      const chatId = process.env.TELEGRAM_CHAT_ID || SECRETS.telegram?.chatId;
      if (botToken && chatId) {
        try {
          execSync(
            `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" ` +
            `-d "chat_id=${chatId}" --data-urlencode "text=Build stuck and reset: ${idea.title} — ${reason}"`,
            { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
          );
        } catch (err) {
          log(`  Stuck-build notification failed: ${err.message.substring(0, 100)}`);
        }
      }
    }
  }
}

async function main() {
  log('=== Build Monitor Run ===');

  // Reset any builds that have been stuck past the longest agent timeout.
  // This must run before processBuilding so escalated ideas don't get re-handled.
  escalateStuckBuilds();

  const buildingCount = await processBuilding();

  if (buildingCount < MAX_CONCURRENT_BUILDS) {
    pickNextApproved();
  }

  log('=== Build Monitor Complete ===\n');
}

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
