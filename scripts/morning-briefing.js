#!/usr/bin/env node
/**
 * Morning Briefing Generator
 * 
 * Combined daily digest with:
 * - Dribbble inspiration (with images)
 * - Overnight builds from Mission Control
 * - Newsletter summaries
 * - ArXiv AI papers
 * - Relevant news/topics
 * 
 * Schedule: Daily at 8 AM PST
 * Output: Telegram message + Obsidian note
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAVE_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/Agent Saved';
const MEMORY_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/memory';
const DASHBOARD_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/dashboard';
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || 'dev:beloved-giraffe-115|eyJ2MiI6ImM3ZjkyNDliMDI4ODQ0OThhMDkwMWIyNjIzNDYwMjQ2In0=';

function getTodayDate() {
  // Use PST timezone: YYYY-MM-DD
  const d = new Date();
  const pstStr = d.toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // Parse MM/DD/YYYY format
  const [month, day, year] = pstStr.split('/');
  return `${year}-${month}-${day}`;
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pstStr = d.toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = pstStr.split('/');
  return `${year}-${month}-${day}`;
}

// Get overnight builds
function getOvernightBuilds() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:listByStatus '{"status":"done"}'`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
    );
    
    const ideas = JSON.parse(output);
    const yesterday = getYesterdayDate();
    
    // Filter to yesterday's completions
    return ideas.filter(i => {
      const doneDate = i.doneAt ? new Date(i.doneAt).toISOString().split('T')[0] : null;
      return doneDate === yesterday;
    }).slice(0, 10);
  } catch (err) {
    console.error('Failed to fetch builds:', err.message);
    return [];
  }
}

// Get in-progress builds
function getInProgressBuilds() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:listByStatus '{"status":"building"}'`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
    );
    
    return JSON.parse(output).slice(0, 5);
  } catch (err) {
    return [];
  }
}

// Get newsletter summaries
function getNewsletterSummaries() {
  const summaries = [];
  const today = getTodayDate();
  
  // Check for today's digest
  const digestPath = path.join(MEMORY_DIR, 'newsletters', `${today}-digest-index.md`);
  if (fs.existsSync(digestPath)) {
    const content = fs.readFileSync(digestPath, 'utf-8');
    // Extract key highlights
    const lines = content.split('\n').filter(l => l.startsWith('- **'));
    summaries.push(...lines.slice(0, 5));
  }
  
  return summaries;
}

// Get ArXiv papers
function getArxivPapers() {
  const papers = [];
  const arxivDir = path.join(MEMORY_DIR, 'arxiv');
  
  if (!fs.existsSync(arxivDir)) return papers;
  
  const files = fs.readdirSync(arxivDir)
    .filter(f => f.endsWith('.json') && !f.includes('digest') && !f.includes('index'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(arxivDir, a));
      const statB = fs.statSync(path.join(arxivDir, b));
      return statB.mtime - statA.mtime;
    })
    .slice(0, 3);
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(arxivDir, file), 'utf-8'));
      if (data.significance?.score >= 50) {
        papers.push({
          title: data.title,
          score: data.significance.score,
          summary: data.summary?.split('\n')[0] || ''
        });
      }
    } catch {}
  }
  
  return papers;
}

// Get Dribbble shots with actual image files
function getDribbbleShotsWithImages() {
  const today = getTodayDate();
  const dribbbleDir = path.join(SAVE_DIR, 'dribbble', today);
  
  if (!fs.existsSync(dribbbleDir)) return [];
  
  // Look for saved image files (both naming conventions)
  const imageFiles = fs.readdirSync(dribbbleDir)
    .filter(f => (f.endsWith('.png') || f.endsWith('.jpg')) && f !== 'shots.json')
    .filter(f => fs.statSync(path.join(dribbbleDir, f)).size > 1000) // Skip tiny/error files
    .map(f => ({
      path: path.join(dribbbleDir, f),
      filename: f,
      title: f.replace(/^(dribbble-|shot-)/, '').replace(/-\d+\.(png|jpg)$/, '').replace(/\.(png|jpg)$/, '').replace(/-/g, ' ')
    }));
  
  // Also try to get metadata if available
  const metadataPath = path.join(dribbbleDir, 'shots.json');
  let shotsWithMeta = imageFiles;
  
  if (fs.existsSync(metadataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const shots = data.shots || [];
      
      // Match images to metadata
      shotsWithMeta = imageFiles.map((img, idx) => {
        const meta = shots[idx] || {};
        return {
          ...img,
          title: meta.title || img.title,
          designer: meta.designer || 'Unknown',
          shotUrl: meta.shotUrl || '',
          likes: meta.likes || 0
        };
      });
      
      // Sort by likes (best first)
      shotsWithMeta.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } catch {}
  }
  
  // Return top 5
  return shotsWithMeta.slice(0, 5);
}

// Send Dribbble images via Telegram
function sendDribbbleImagesTelegram(shots) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '7923502221';
  
  if (!botToken || shots.length === 0) {
    console.log('Telegram not configured or no shots, skipping images');
    return;
  }
  
  shots.forEach((shot, i) => {
    try {
      const caption = `🎨 ${shot.title}${shot.designer ? ` by ${shot.designer}` : ''}${shot.likes ? ` (${shot.likes} likes)` : ''}`;
      
      execSync(
        `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendPhoto" \
          -F "chat_id=${chatId}" \
          -F "photo=@${shot.path}" \
          -F "caption=${caption}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ Sent Dribbble image ${i + 1}: ${shot.title}`);
    } catch (err) {
      console.error(`Failed to send image ${i + 1}:`, err.message);
    }
  });
}

// Generate briefing
function generateBriefing() {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const builds = getOvernightBuilds();
  const inProgress = getInProgressBuilds();
  const newsletters = getNewsletterSummaries();
  const papers = getArxivPapers();
  const dribbbleShots = getDribbbleShotsWithImages();
  
  // DEBUG: If zero builds completed, trigger investigation
  if (builds.length === 0) {
    console.log('🚨 ZERO BUILDS DETECTED — Starting debug investigation...');
    try {
      // Check build monitor status
      const debugOutput = execSync(
        `cd "${DASHBOARD_DIR}" && npx convex run ideas:getStats 2>&1`,
        { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
      );
      const stats = JSON.parse(debugOutput);
      console.log('Build stats:', stats);
      
      // Log to debug file
      const debugLog = `[${new Date().toISOString()}] ZERO BUILDS\nStats: ${JSON.stringify(stats, null, 2)}\n`;
      fs.appendFileSync(path.join(MEMORY_DIR, 'build-debug.log'), debugLog);
      
      // Alert in briefing
      console.log('⚠️  Debug info logged to build-debug.log');
    } catch (err) {
      console.error('Debug investigation failed:', err.message);
    }
  }
  
  let briefing = `🌅 **Morning Briefing — ${date}**

`;
  
  // Executive Summary
  const totalBuilds = builds.length;
  const highPotentialBuilds = builds.filter(b => b.potential === 'high' || b.potential === 'moonshot').length;
  const inProgressCount = inProgress.length;
  
  briefing += `## 📊 At a Glance

`;
  
  // Alert for zero builds
  if (totalBuilds === 0) {
    briefing += `⚠️ **0 builds completed overnight** — Debug investigation triggered\n`;
    briefing += `Check: ~/NateMate/notes/NateMateNotes/memory/build-debug.log\n`;
    briefing += `Likely causes: Overnight script didn't run, or build monitor not spawning agents\n\n`;
  }
  
  briefing += `• **${totalBuilds}** builds completed overnight`;
  if (highPotentialBuilds > 0) briefing += ` (${highPotentialBuilds} high/moonshot potential)`;
  briefing += `
`;
  if (inProgressCount > 0) briefing += `• **${inProgressCount}** builds currently in progress
`;
  if (dribbbleShots.length > 0) briefing += `• **${dribbbleShots.length}** design inspirations from Dribbble
`;
  if (papers.length > 0) briefing += `• **${papers.length}** notable AI research papers
`;
  briefing += `
`;
  
  // Overnight builds
  if (builds.length > 0) {
    briefing += `## 🚀 Completed Overnight

`;
    
    // Separate by potential
    const moonshotBuilds = builds.filter(b => b.potential === 'moonshot');
    const highBuilds = builds.filter(b => b.potential === 'high');
    const otherBuilds = builds.filter(b => b.potential !== 'moonshot' && b.potential !== 'high');
    
    if (moonshotBuilds.length > 0) {
      briefing += `**🌟 Moonshot Potential:**

`;
      moonshotBuilds.forEach(b => {
        briefing += `### ${b.title}
`;
        briefing += `${b.description?.substring(0, 200)}...

`;
        briefing += `**Target:** ${b.targetAudience || 'General users'}  
`;
        if (b.deployedUrl) briefing += `**Live:** ${b.deployedUrl}  
`;
        briefing += `**Status:** ✅ Complete

`;
      });
    }
    
    if (highBuilds.length > 0) {
      briefing += `**🔥 High Potential:**

`;
      highBuilds.forEach(b => {
        briefing += `### ${b.title}
`;
        briefing += `${b.description?.substring(0, 150)}...

`;
        if (b.deployedUrl) briefing += `🔗 [View Build](${b.deployedUrl})

`;
      });
    }
    
    if (otherBuilds.length > 0) {
      briefing += `**📦 Also Completed:**

`;
      otherBuilds.slice(0, 5).forEach(b => {
        briefing += `• **${b.title}** — ${b.potential} potential`;
        if (b.deployedUrl) briefing += ` — [View](${b.deployedUrl})`;
        briefing += `
`;
      });
      if (otherBuilds.length > 5) {
        briefing += `• *and ${otherBuilds.length - 5} more...*
`;
      }
      briefing += `
`;
    }
  }
  
  // In progress
  if (inProgress.length > 0) {
    briefing += `## 🔨 Building Now

`;
    inProgress.forEach(b => {
      const statusEmoji = b.potential === 'high' || b.potential === 'moonshot' ? '🔥' : '⚙️';
      briefing += `${statusEmoji} **${b.title}** — ${b.potential} potential
`;
    });
    briefing += `
`;
  }
  
  // Design Inspiration
  if (dribbbleShots.length > 0) {
    briefing += `## 🎨 Design Inspiration — Curated from Dribbble

`;
    dribbbleShots.forEach((shot, i) => {
      briefing += `**${i + 1}. ${shot.title}**`;
      if (shot.designer) briefing += ` — ${shot.designer}`;
      if (shot.likes) briefing += ` ⭐ ${shot.likes}`;
      briefing += `
`;
      if (shot.shotUrl) briefing += `   [View on Dribbble](${shot.shotUrl})
`;
      briefing += `   📁 \`${shot.filename}\`

`;
    });
  }
  
  // Newsletter Highlights
  if (newsletters.length > 0) {
    briefing += `## 📰 Newsletter Highlights

`;
    newsletters.forEach(n => {
      briefing += `• ${n.replace(/^- \*\*/, '').replace(/\*\*$/, '')}
`;
    });
    briefing += `
`;
  }
  
  // ArXiv papers
  if (papers.length > 0) {
    briefing += `## 🔬 Notable AI Research

`;
    papers.forEach((p, i) => {
      briefing += `**${i + 1}. ${p.title}** (Score: ${p.score})
`;
      briefing += `${p.summary?.substring(0, 250)}...

`;
    });
  }
  
  // Footer
  briefing += `---

`;
  briefing += `📊 **Dashboard:** https://dashboard-jnst3t9xe-n8garvies-projects.vercel.app  
`;
  briefing += `🕐 **Generated:** ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' })} PST`;
  
  return briefing;
}

// Save to Obsidian
function saveToObsidian(content) {
  const date = getTodayDate();
  const filepath = path.join(MEMORY_DIR, 'briefings', `${date}-morning-briefing.md`);
  
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, content);
  
  return filepath;
}

// Send Telegram notification
function sendTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '7923502221';
  
  if (!botToken) {
    console.log('Telegram not configured, skipping notification');
    return;
  }
  
  try {
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" \
        -d "chat_id=${chatId}" \
        -d "text=${encodeURIComponent(message)}" \
        -d "parse_mode=Markdown"`,
      { stdio: 'pipe' }
    );
    console.log('✓ Telegram notification sent');
  } catch (err) {
    console.error('Failed to send Telegram:', err.message);
  }
}

// Main
async function main() {
  console.log('🌅 Generating Morning Briefing...\n');
  
  const briefing = generateBriefing();
  const filepath = saveToObsidian(briefing);
  
  console.log(briefing);
  console.log(`\n✓ Saved to: ${filepath}`);
  
  // Get shots for image sending
  const dribbbleShots = getDribbbleShotsWithImages();
  
  // Send Dribbble images first
  if (dribbbleShots.length > 0) {
    console.log(`\n📸 Sending ${dribbbleShots.length} Dribbble images...`);
    sendDribbbleImagesTelegram(dribbbleShots);
  }
  
  // Send text briefing
  sendTelegram(briefing);
}

main().catch(console.error);
