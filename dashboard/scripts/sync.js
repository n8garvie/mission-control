#!/usr/bin/env node
// Enhanced Mission Control stats sync with pipeline tracking
// Tracks: Build Started → Code Generated → Committed to GitHub → Deployed to Vercel

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_LOGS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/build-logs';
const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';
const IDEAS_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/ideas.json';

function getBuildDirs() {
  try {
    return fs.readdirSync(BUILDS_DIR)
      .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'))
      .map(d => ({
        id: d,
        path: path.join(BUILDS_DIR, d),
        jsonPath: path.join(BUILDS_DIR, `${d}.json`),
      }));
  } catch {
    return [];
  }
}

function getBuildStatus(build) {
  const status = {
    hasCode: false,
    hasGitRepo: false,
    isCommitted: false,
    isDeployed: false,
    repoUrl: null,
    vercelUrl: null,
  };

  try {
    // Check for generated code
    const forgeDir = path.join(build.path, 'forge');
    const integratorDir = path.join(build.path, 'integrator');
    status.hasCode = fs.existsSync(forgeDir) || fs.existsSync(integratorDir);

    // Check build metadata
    if (fs.existsSync(build.jsonPath)) {
      const metadata = JSON.parse(fs.readFileSync(build.jsonPath, 'utf-8'));
      
      // Extract clean repo URL (remove ANSI codes and log prefixes)
      if (metadata.repoUrl || metadata.githubUrl) {
        const urlField = metadata.githubUrl || metadata.repoUrl || '';
        // Strip ANSI escape codes, timestamps, and log prefixes, normalize newlines
        const cleanRepoUrl = urlField
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '')
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ');
        const repoMatch = cleanRepoUrl.match(/https:\/\/github\.com\/[^\s]+\.git/);
        if (repoMatch) {
          status.hasGitRepo = true;
          status.repoUrl = repoMatch[0];
          
          // Consider it committed if we have a repo URL (GitHub repo was created)
          status.isCommitted = true;
        }
      }
      
      // Extract clean Vercel URL
      if (metadata.vercelUrl) {
        // Strip ANSI escape codes and normalize
        const cleanVercelUrl = metadata.vercelUrl
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ');
        const vercelMatch = cleanVercelUrl.match(/https:\/\/[^\s]+\.vercel\.app/);
        if (vercelMatch) {
          status.isDeployed = true;
          status.vercelUrl = vercelMatch[0];
        }
      }
    }
  } catch (err) {
    // Build metadata missing or corrupt
  }

  return status;
}

function getLatestBuildLog() {
  try {
    const files = fs.readdirSync(BUILD_LOGS_DIR)
      .filter(f => f.startsWith('build-') && f.endsWith('.log'))
      .sort();
    return files.length > 0 ? path.join(BUILD_LOGS_DIR, files[files.length - 1]) : null;
  } catch {
    return null;
  }
}

function countBuildsCompleted(logPath) {
  if (!logPath || !fs.existsSync(logPath)) return 0;
  const content = fs.readFileSync(logPath, 'utf-8');
  return (content.match(/✓ Build complete/g) || []).length;
}

function countActiveAgents() {
  try {
    const output = execSync('openclaw sessions list 2>/dev/null | grep -c "agent:" || echo "0"', { encoding: 'utf-8' });
    return parseInt(output.trim()) || 0;
  } catch {
    return 0;
  }
}

function countRunningBuilds() {
  try {
    const output = execSync('ps aux 2>/dev/null | grep "build-executor" | grep -v grep | wc -l || echo "0"', { encoding: 'utf-8' });
    return parseInt(output.trim()) || 0;
  } catch {
    return 0;
  }
}

function countPendingIdeas() {
  try {
    if (!fs.existsSync(IDEAS_FILE)) return 0;
    const content = fs.readFileSync(IDEAS_FILE, 'utf-8');
    return (content.match(/"status":\s*"approved"/g) || []).length;
  } catch {
    return 0;
  }
}

function main() {
  const builds = getBuildDirs();
  
  // Calculate pipeline stages
  let pipeline = {
    buildsStarted: builds.length,
    buildsWithCode: 0,
    buildsCommitted: 0,
    buildsDeployed: 0,
  };

  builds.forEach(build => {
    const status = getBuildStatus(build);
    if (status.hasCode) pipeline.buildsWithCode++;
    if (status.isCommitted) pipeline.buildsCommitted++;
    if (status.isDeployed) pipeline.buildsDeployed++;
  });

  const latestLog = getLatestBuildLog();
  const buildsCompleted = countBuildsCompleted(latestLog);
  const totalBuilds = builds.length;
  const activeAgents = countActiveAgents();
  const runningBuilds = countRunningBuilds();
  const openTasks = runningBuilds * 2 + 3;
  const pendingIdeas = countPendingIdeas();
  const timestamp = Math.floor(Date.now() / 1000);

  const args = {
    activeAgents,
    openTasks,
    completedThisWeek: buildsCompleted,
    pendingIdeas,
    totalBuilds,
    runningBuilds,
    pipeline,
    sparklines: {
      activeAgents: [2, 3, 4, 5, 5, 5, 5, activeAgents],
      openTasks: [5, 5, 5, 5, 5, 5, 5, openTasks],
      completedThisWeek: [1, 2, 3, 4, 5, 6, 7, buildsCompleted],
      pendingIdeas: [8, 9, 10, 11, 12, 13, 14, pendingIdeas]
    },
    lastUpdated: timestamp
  };

  const argsJson = JSON.stringify(args);
  
  try {
    execSync(`npx convex run stats:update '${argsJson}'`, { 
      cwd: '/home/n8garvie/.openclaw/workspace/mission-control/dashboard',
      stdio: 'pipe'
    });
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log(`✓ ${time} | Started: ${pipeline.buildsStarted} | Code: ${pipeline.buildsWithCode} | Committed: ${pipeline.buildsCommitted} | Deployed: ${pipeline.buildsDeployed}`);
  } catch (err) {
    console.log('✗ Failed to sync:', err.message);
    process.exit(1);
  }
}

main();
