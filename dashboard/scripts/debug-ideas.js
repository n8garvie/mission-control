#!/usr/bin/env node
// Debug script to compare Convex ideas with actual GitHub repos and build status

const fs = require('fs');
const path = require('path');

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';

// Extract repo name from messy repoUrl field
function extractRepoName(repoUrl) {
  if (!repoUrl) return null;
  // Strip ANSI codes and extract repo name
  const clean = repoUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/github\.com\/n8garvie\/([^\s\.]+)/);
  return match ? match[1] : null;
}

// Check if build has GitHub repo
function getBuildInfo(buildId) {
  const jsonPath = path.join(BUILDS_DIR, `${buildId}.json`);
  if (!fs.existsSync(jsonPath)) return { hasRepo: false, hasVercel: false };
  
  try {
    const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const repoName = extractRepoName(metadata.repoUrl);
    const vercelUrl = metadata.vercelUrl ? 
      metadata.vercelUrl.match(/https:\/\/[^\s]+\.vercel\.app/) : null;
    
    return {
      hasRepo: !!repoName,
      repoName,
      hasVercel: !!vercelUrl,
      vercelUrl: vercelUrl ? vercelUrl[0] : null,
      status: metadata.status,
    };
  } catch (e) {
    return { hasRepo: false, hasVercel: false };
  }
}

function main() {
  // Get all build directories
  const builds = fs.readdirSync(BUILDS_DIR)
    .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'))
    .map(id => ({ id, ...getBuildInfo(id) }));

  const stats = {
    totalBuilds: builds.length,
    withRepo: builds.filter(b => b.hasRepo).length,
    withVercel: builds.filter(b => b.hasVercel).length,
    inProgress: builds.filter(b => b.status === 'in_progress').length,
    repos: builds.filter(b => b.hasRepo).map(b => b.repoName),
  };

  console.log('=== Build Pipeline Analysis ===\n');
  console.log(`Total build directories: ${stats.totalBuilds}`);
  console.log(`With GitHub repo: ${stats.withRepo}`);
  console.log(`With Vercel deploy: ${stats.withVercel}`);
  console.log(`In progress: ${stats.inProgress}\n`);
  
  console.log('=== Repos Created ===');
  stats.repos.forEach(repo => console.log(`  - ${repo}`));
  
  // Show builds without repos
  console.log('\n=== Builds Without Repos (incomplete) ===');
  builds.filter(b => !b.hasRepo).forEach(b => {
    console.log(`  - ${b.id} (${b.status || 'unknown'})`);
  });
}

main();
