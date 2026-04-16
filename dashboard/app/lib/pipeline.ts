// Unified pipeline data - connects ideas to actual build status
// NOTE: This file uses Node.js APIs and should only be imported in Server Components or API routes
import fs from 'fs';
import path from 'path';

const BUILDS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/builds';
const BUILD_LOGS_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/build-logs';

export interface PipelineIdea {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'building' | 'agent_complete' | 'github_pushed' | 'vercel_deployed';
  stage: number; // 0-5 for progress bar
  createdAt: number;
  approvedAt?: number;
  buildStartedAt?: number;
  agentCompletedAt?: number;
  githubUrl?: string;
  vercelUrl?: string;
  buildId?: string;
  potential: 'low' | 'medium' | 'high' | 'moonshot';
}

function extractUrl(repoUrl: string | undefined): string | undefined {
  if (!repoUrl) return undefined;
  const clean = repoUrl.replace(/\x1b\[[0-9;]*m/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/github\.com\/[^\s]+\.git/);
  return match ? match[0].replace('.git', '') : undefined;
}

function extractVercel(vercelUrl: string | undefined): string | undefined {
  if (!vercelUrl) return undefined;
  const clean = vercelUrl.replace(/\x1b\[[0-9;]*m/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ');
  const match = clean.match(/https:\/\/[^\s]+\.vercel\.app/);
  return match ? match[0] : undefined;
}

export function getPipelineFromBuilds(): PipelineIdea[] {
  const pipeline: PipelineIdea[] = [];
  
  try {
    const buildDirs = fs.readdirSync(BUILDS_DIR)
      .filter(d => d.startsWith('k') && !d.includes('.') && !d.includes('-'));
    
    for (const buildId of buildDirs) {
      const jsonPath = path.join(BUILDS_DIR, `${buildId}.json`);
      
      try {
        const content = fs.readFileSync(jsonPath, 'utf-8');
        const metadata = JSON.parse(content);
        
        const githubUrl = extractUrl(metadata.repoUrl);
        const vercelUrl = extractVercel(metadata.vercelUrl);
        
        let status: PipelineIdea['status'] = 'building';
        let stage = 2;
        
        if (vercelUrl) {
          status = 'vercel_deployed';
          stage = 5;
        } else if (githubUrl) {
          status = 'github_pushed';
          stage = 4;
        } else if (metadata.status === 'in_progress') {
          // Check if code exists
          const hasCode = fs.existsSync(path.join(BUILDS_DIR, buildId, 'forge')) ||
                         fs.existsSync(path.join(BUILDS_DIR, buildId, 'integrator'));
          if (hasCode) {
            status = 'agent_complete';
            stage = 3;
          } else {
            status = 'building';
            stage = 2;
          }
        }
        
        pipeline.push({
          id: buildId,
          title: metadata.title || 'Untitled',
          description: metadata.description || '',
          status,
          stage,
          createdAt: new Date(metadata.startedAt || Date.now()).getTime(),
          approvedAt: new Date(metadata.startedAt || Date.now()).getTime(),
          buildStartedAt: new Date(metadata.startedAt || Date.now()).getTime(),
          githubUrl,
          vercelUrl,
          buildId,
          potential: metadata.potential || 'medium',
        });
      } catch (e) {
        // Skip invalid build metadata
      }
    }
  } catch (e) {
    // Directory doesn't exist
  }
  
  return pipeline.sort((a, b) => b.createdAt - a.createdAt);
}

export function getPipelineStats() {
  const pipeline = getPipelineFromBuilds();
  
  return {
    total: pipeline.length,
    pending: 0, // No pending from builds - pending comes from Convex
    approved: 0, // No approved from builds
    building: pipeline.filter(p => p.status === 'building').length,
    agentComplete: pipeline.filter(p => p.status === 'agent_complete').length,
    githubPushed: pipeline.filter(p => p.status === 'github_pushed').length,
    vercelDeployed: pipeline.filter(p => p.status === 'vercel_deployed').length,
  };
}

export function getStageLabel(status: PipelineIdea['status']): string {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    building: 'Building',
    agent_complete: 'Code Ready',
    github_pushed: 'On GitHub',
    vercel_deployed: 'Live',
  };
  return labels[status] || status;
}

export function getStageColor(status: PipelineIdea['status']): string {
  const colors: Record<string, string> = {
    pending: 'text-gray-500',
    approved: 'text-blue-500',
    building: 'text-amber-500',
    agent_complete: 'text-purple-500',
    github_pushed: 'text-indigo-500',
    vercel_deployed: 'text-green-500',
  };
  return colors[status] || 'text-gray-500';
}
