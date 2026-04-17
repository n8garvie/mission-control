#!/usr/bin/env node
// Sync existing builds from filesystem to Convex

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';

function extractUrl(repoUrl) {
  if (!repoUrl) return null;
  const clean = repoUrl.replace(/\x1b\[[0-9;]*m/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/github\.com\/[^\s\/]+(?:\.git)?/);
  return match ? match[0].replace('.git', '') : null;
}

function extractVercel(vercelUrl) {
  if (!vercelUrl) return null;
  const clean = vercelUrl.replace(/\x1b\[[0-9;]*m/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ');
  const match = clean.match(/https?:\/\/[^\s"]+\.vercel\.app/);
  if (match) return match[0];
  const matchNoProtocol = clean.match(/[a-z0-9-]+\.vercel\.app/);
  return matchNoProtocol ? `https://${matchNoProtocol[0]}` : null;
}

function getBuildStatus(metadata) {
  const githubUrl = extractUrl(metadata.repoUrl);
  const vercelUrl = extractVercel(metadata.vercelUrl);
  
  if (vercelUrl) return { status: 'vercel_deployed', stage: 5, githubUrl, vercelUrl };
  if (githubUrl) return { status: 'github_pushed', stage: 4, githubUrl, vercelUrl: null };
  return { status: 'building', stage: 2, githubUrl: null, vercelUrl: null };
}

function main() {
  const buildDirs = fs.readdirSync(BUILDS_DIR)
    .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'));

  console.log(`Found ${buildDirs.length} build directories`);

  let synced = 0;
  let errors = 0;

  for (const buildId of buildDirs) {
    const jsonPath = path.join(BUILDS_DIR, `${buildId}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      // Clean up newlines in string values that break JSON parsing
      const cleaned = content
        .replace(/: "[^"]*\n[^"]*"/g, (match) => match.replace(/\n/g, '\\n').replace(/\r/g, ''))
        .replace(/: '[^']*\n[^']*'/g, (match) => match.replace(/\n/g, '\\n').replace(/\r/g, ''));
      const metadata = JSON.parse(cleaned);

      const { status, stage, githubUrl, vercelUrl } = getBuildStatus(metadata);

      const args = {
        buildId,
        title: metadata.title || 'Untitled',
        description: metadata.description || '',
        status,
        stage,
        potential: metadata.potential || 'medium',
        githubUrl,
        vercelUrl,
      };

      execSync(
        `npx convex run builds:upsert '${JSON.stringify(JSON.stringify(args))}'`,
        { cwd: '/home/n8garvie/.openclaw/workspace/mission-control/dashboard', stdio: 'pipe' }
      );

      synced++;
      process.stdout.write('.');
    } catch (e) {
      errors++;
      process.stdout.write('x');
    }
  }

  console.log(`\n\nSynced ${synced} builds (${errors} errors)`);
}

main();
