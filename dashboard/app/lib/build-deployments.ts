// Get deployment status directly from build directories
// This avoids needing to sync with Convex

import fs from 'fs';
import path from 'path';

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';

function extractCleanUrl(repoUrl: string | undefined): string | null {
  if (!repoUrl) return null;
  const clean = repoUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/github\.com\/[^\s]+\.git/);
  return match ? match[0].replace('.git', '') : null;
}

function extractVercelUrl(vercelUrl: string | undefined): string | null {
  if (!vercelUrl) return null;
  const clean = vercelUrl
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/[^\s]+\.vercel\.app/);
  return match ? match[0] : null;
}

export interface BuildDeploymentInfo {
  buildId: string;
  ideaId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'github_created' | 'vercel_deployed' | 'failed';
  githubRepoUrl: string | null;
  vercelUrl: string | null;
  startedAt: string | null;
}

export function getBuildDeploymentInfo(buildId: string): BuildDeploymentInfo {
  const jsonPath = path.join(BUILDS_DIR, `${buildId}.json`);
  
  const defaultInfo: BuildDeploymentInfo = {
    buildId,
    ideaId: buildId,
    title: 'Unknown',
    status: 'not_started',
    githubRepoUrl: null,
    vercelUrl: null,
    startedAt: null,
  };

  if (!fs.existsSync(jsonPath)) {
    return defaultInfo;
  }

  try {
    // Read and parse JSON, handling potential newlines in values
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const metadata = JSON.parse(content);

    const githubRepoUrl = extractCleanUrl(metadata.repoUrl);
    const vercelUrl = extractVercelUrl(metadata.vercelUrl);

    let status: BuildDeploymentInfo['status'] = 'not_started';
    if (vercelUrl) {
      status = 'vercel_deployed';
    } else if (githubRepoUrl) {
      status = 'github_created';
    } else if (metadata.status === 'in_progress') {
      status = 'in_progress';
    }

    return {
      buildId,
      ideaId: metadata.ideaId || buildId,
      title: metadata.title || 'Unknown',
      status,
      githubRepoUrl,
      vercelUrl,
      startedAt: metadata.startedAt || null,
    };
  } catch (e) {
    return defaultInfo;
  }
}

export function getAllBuildDeployments(): BuildDeploymentInfo[] {
  try {
    const buildDirs = fs.readdirSync(BUILDS_DIR)
      .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'));
    
    return buildDirs.map(getBuildDeploymentInfo);
  } catch (e) {
    return [];
  }
}

export function getDeploymentStats() {
  const deployments = getAllBuildDeployments();
  
  return {
    total: deployments.length,
    vercelDeployed: deployments.filter(d => d.status === 'vercel_deployed').length,
    githubOnly: deployments.filter(d => d.status === 'github_created').length,
    inProgress: deployments.filter(d => d.status === 'in_progress').length,
    notStarted: deployments.filter(d => d.status === 'not_started').length,
  };
}
