#!/usr/bin/env node
// Sync build pipeline status with Convex ideas
// Updates deploymentStatus based on actual GitHub/Vercel status

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';

// Extract repo name from messy repoUrl field
function extractRepoName(repoUrl) {
  if (!repoUrl) return null;
  const clean = repoUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/github\.com\/n8garvie\/([^\s\.]+)/);
  return match ? match[1] : null;
}

// Extract clean URL
function extractCleanUrl(repoUrl) {
  if (!repoUrl) return null;
  const clean = repoUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/github\.com\/[^\s]+\.git/);
  return match ? match[0].replace('.git', '') : null;
}

function extractVercelUrl(vercelUrl) {
  if (!vercelUrl) return null;
  const clean = vercelUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/[^\s]+\.vercel\.app/);
  return match ? match[0] : null;
}

// Get deployment status for a build
function getBuildDeploymentStatus(buildId) {
  const jsonPath = path.join(BUILDS_DIR, `${buildId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return { status: 'not_started', repoUrl: null, vercelUrl: null };
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const repoName = extractRepoName(metadata.repoUrl);
    const repoUrl = extractCleanUrl(metadata.repoUrl);
    const vercelUrl = extractVercelUrl(metadata.vercelUrl);

    if (vercelUrl) {
      return { status: 'vercel_deployed', repoUrl, vercelUrl };
    } else if (repoUrl) {
      return { status: 'github_created', repoUrl, vercelUrl: null };
    } else {
      return { status: 'in_progress', repoUrl: null, vercelUrl: null };
    }
  } catch (e) {
    return { status: 'not_started', repoUrl: null, vercelUrl: null };
  }
}

// Map build directory to idea ID
function getBuildIdeaId(buildId) {
  // Build ID format is usually the same as idea ID
  return buildId;
}

function main() {
  // Get all build directories
  const buildDirs = fs.readdirSync(BUILDS_DIR)
    .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'));

  console.log(`Found ${buildDirs.length} build directories`);

  let updated = 0;
  let deployed = 0;
  let githubOnly = 0;

  buildDirs.forEach(buildId => {
    const deployment = getBuildDeploymentStatus(buildId);
    const ideaId = getBuildIdeaId(buildId);

    if (deployment.status === 'vercel_deployed') {
      deployed++;
    } else if (deployment.status === 'github_created') {
      githubOnly++;
    }

    // Update the idea in Convex with deployment status
    const updateData = {
      ideaId: ideaId,
      deploymentStatus: deployment.status,
      githubRepoUrl: deployment.repoUrl,
      deployedUrl: deployment.vercelUrl,
      buildId: buildId,
    };

    try {
      execSync(
        `npx convex run ideas:updateDeployment '${JSON.stringify(JSON.stringify(updateData))}'`,
        { cwd: '/home/n8garvie/.openclaw/workspace/mission-control/dashboard', stdio: 'pipe' }
      );
      updated++;
    } catch (err) {
      // Idea might not exist in Convex
    }
  });

  console.log(`\nUpdated ${updated} ideas`);
  console.log(`  - Vercel deployed: ${deployed}`);
  console.log(`  - GitHub only: ${githubOnly}`);
  console.log(`  - In progress/not started: ${updated - deployed - githubOnly}`);
}

main();
