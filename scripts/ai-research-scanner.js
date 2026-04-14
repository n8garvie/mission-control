#!/usr/bin/env node
/**
 * ArXiv AI Paper Scanner
 * 
 * Monitors arXiv for major AI papers, tracks traction (citations, discussions),
 * and generates human-readable summaries.
 * 
 * Categories: cs.AI, cs.CL, cs.LG, cs.CV, cs.RO
 * Filters: High engagement, trending on HN/Reddit/Twitter
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/memory/arxiv';
const CATEGORIES = ['cs.AI', 'cs.CL', 'cs.LG', 'cs.CV', 'cs.RO', 'cs.HC'];

// Significance thresholds
const SIGNIFICANCE = {
  CRITICAL: 80,  // Must notify
  HIGH: 50,      // Include in daily digest
  MEDIUM: 25,    // Archive only
  LOW: 0         // Skip unless explicitly searched
};

// Tier weights for scoring
const WEIGHTS = {
  hnScore: 2,           // Hacker News points
  hnComments: 3,        // Hacker News comments (more valuable)
  twitterMentions: 2,   // Twitter/X discussions
  citationVelocity: 5,  // Citations per day since publish
  authorReputation: 3,  // Top-tier authors/institutions
  githubStars: 0.1,     // Per star for repos
  githubForks: 2,       // Per fork
  recency: 1,           // Multiplier for recent items
  relevance: 10         // Matches user interests
};

// Keywords that indicate high relevance to Nathan
const HIGH_RELEVANCE_KEYWORDS = [
  'design', 'ux', 'ui', 'interface', 'visual', 'creative',
  'productivity', 'workflow', 'automation', 'agent',
  'llm', 'language model', 'gpt', 'claude',
  'video', 'image generation', 'diffusion', 'multimodal',
  'meta', 'facebook', 'instagram', 'threads',
  'porsche', 'watch', 'espresso', 'coffee',
  'finance', 'trading', 'investment', 'portfolio'
];

// Ensure memory directory exists
fs.mkdirSync(MEMORY_DIR, { recursive: true });

async function fetchArxivPapers(daysBack = 7, maxResults = 50) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  
  // Build query for AI-related categories
  const catQuery = CATEGORIES.map(c => `cat:${c}`).join('+OR+');
  const url = `http://export.arxiv.org/api/query?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xml = await response.text();
    return parseArxivXML(xml);
  } catch (err) {
    console.error('ArXiv fetch failed:', err.message);
    return [];
  }
}

function parseArxivXML(xml) {
  const papers = [];
  const entries = xml.match(/<entry>.*?<\/entry>/gs) || [];
  
  for (const entry of entries) {
    const id = (entry.match(/<id>(.*?)<\/id>/) || [])[1] || '';
    const title = (entry.match(/<title>(.*?)<\/title>/s) || [])[1]?.replace(/\n/g, ' ').trim() || '';
    const summary = (entry.match(/<summary>(.*?)<\/summary>/s) || [])[1]?.trim() || '';
    const authors = (entry.match(/<name>(.*?)<\/name>/g) || []).map(a => a.replace(/<\/?name>/g, '')).slice(0, 5);
    const published = (entry.match(/<published>(.*?)<\/published>/) || [])[1] || '';
    const categories = (entry.match(/<category term="(.*?)"/g) || []).map(c => c.match(/term="(.*?)"/)[1]);
    
    // Extract arXiv ID
    const arxivId = id.split('/').pop().replace('abs/', '');
    
    papers.push({
      id: arxivId,
      title,
      summary,
      authors,
      published,
      categories,
      url: `https://arxiv.org/abs/${arxivId}`,
      pdf: `https://arxiv.org/pdf/${arxivId}.pdf`
    });
  }
  
  return papers;
}

async function checkHackerNewsMentions(query) {
  try {
    const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`);
    const data = await response.json();
    return data.hits?.map(h => ({
      title: h.title,
      points: h.points || 0,
      comments: h.num_comments || 0,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`
    })) || [];
  } catch {
    return [];
  }
}

function calculateSignificance(item) {
  let score = 0;
  let factors = [];
  
  // Hacker News signals
  if (item.hnMentions?.length > 0) {
    const hnTotal = item.hnMentions.reduce((sum, h) => {
      return sum + (h.points * WEIGHTS.hnScore) + (h.comments * WEIGHTS.hnComments);
    }, 0);
    score += hnTotal;
    if (hnTotal > 50) factors.push('HN traction');
  }
  
  // GitHub signals
  if (item.stars) {
    const ghScore = (item.stars * WEIGHTS.githubStars) + ((item.forks || 0) * WEIGHTS.githubForks);
    score += ghScore;
    if (item.stars > 1000) factors.push('GitHub trending');
  }
  
  // Recency bonus (published within 48 hours)
  const published = new Date(item.published || item.pushedAt);
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 48) {
    score *= 1.5;
    factors.push('Hot off the press');
  }
  
  // Relevance to Nathan's interests
  const content = `${item.title} ${item.summary || item.description || ''}`.toLowerCase();
  const relevanceMatches = HIGH_RELEVANCE_KEYWORDS.filter(kw => content.includes(kw.toLowerCase()));
  if (relevanceMatches.length > 0) {
    score += relevanceMatches.length * WEIGHTS.relevance;
    factors.push(`Relevant: ${relevanceMatches.slice(0, 2).join(', ')}`);
  }
  
  // Author/institution reputation (simplified check)
  const topInstitutions = ['google', 'openai', 'anthropic', 'deepmind', 'meta', 'stanford', 'mit', 'berkeley'];
  const authorText = (item.authors || []).join(' ').toLowerCase();
  if (topInstitutions.some(inst => authorText.includes(inst) || content.includes(inst))) {
    score += 20;
    factors.push('Top-tier institution');
  }
  
  // Determine tier
  let tier = 'LOW';
  if (score >= SIGNIFICANCE.CRITICAL) tier = 'CRITICAL';
  else if (score >= SIGNIFICANCE.HIGH) tier = 'HIGH';
  else if (score >= SIGNIFICANCE.MEDIUM) tier = 'MEDIUM';
  
  return {
    score: Math.round(score),
    tier,
    factors: factors.slice(0, 3), // Top 3 factors
    notify: tier === 'CRITICAL' || tier === 'HIGH'
  };
}

async function getExistingPaperIds() {
  try {
    const files = fs.readdirSync(MEMORY_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

async function generateHumanSummary(paper) {
  // Try to use Claude if API key available
  let apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    try {
      const authFile = '/home/n8garvie/.openclaw/agents/main/agent/auth-profiles.json';
      const auth = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      apiKey = auth?.profiles?.['anthropic:default']?.key;
    } catch {}
  }
  
  const prompt = `Summarize this AI research paper in plain English for a senior product designer who knows tech but isn't a researcher.

Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Abstract: ${paper.summary}

Provide:
1. **What it is** - One sentence plain English description
2. **Why it matters** - What's the breakthrough or significance?
3. **Key findings** - 2-3 bullet points of main results
4. **Practical impact** - How might this affect products, users, or the industry?

Keep it conversational. Avoid jargon. Write like you're explaining to a smart friend over coffee.`;

  if (apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.content[0].text;
      }
    } catch (err) {
      console.error('Claude summary failed:', err.message);
    }
  }
  
  // Fallback: simple formatting
  return `**What it is:** ${paper.title}\n\n**Abstract:** ${paper.summary.substring(0, 300)}...`;
}

async function processPaper(paper) {
  console.log(`Processing: ${paper.title.substring(0, 60)}...`);
  
  // Check HN for traction
  const hnMentions = await checkHackerNewsMentions(paper.id);
  
  // Generate summary
  const summary = await generateHumanSummary(paper);
  
  const record = {
    id: paper.id,
    type: 'paper',
    title: paper.title,
    authors: paper.authors,
    published: paper.published,
    categories: paper.categories,
    url: paper.url,
    pdf: paper.pdf,
    summary,
    hnMentions,
    processedAt: new Date().toISOString()
  };
  
  // Calculate significance
  const sig = calculateSignificance(record);
  record.significance = sig;
  
  // Save to memory
  const filePath = path.join(MEMORY_DIR, `${paper.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  console.log(`  Score: ${sig.score} (${sig.tier})${sig.notify ? ' [NOTIFY]' : ''}`);
  
  // Send notification if critical
  if (sig.notify) {
    await sendNotification(record);
  }
  
  return record;
}

async function fetchGitHubTrendingAI() {
  console.log('\n🐙 Fetching trending AI repos from GitHub...');
  
  const searchQueries = [
    'artificial-intelligence stars:>100 pushed:>2026-02-10',
    'machine-learning stars:>200 pushed:>2026-02-10',
    'llm stars:>50 pushed:>2026-02-10',
    'transformer stars:>100 pushed:>2026-02-10',
    'diffusion stars:>50 pushed:>2026-02-10'
  ];
  
  const allRepos = [];
  
  for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`;
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NateMate-Scanner/1.0'
        }
      });
      
      if (!response.ok) {
        console.log(`  ⚠️ GitHub API: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const repos = (data.items || []).map(repo => ({
        id: `github-${repo.id}`,
        title: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
        pushedAt: repo.pushed_at,
        topics: repo.topics || []
      }));
      
      allRepos.push(...repos);
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (err) {
      console.error(`  ⚠️ GitHub fetch failed: ${err.message}`);
    }
  }
  
  // Remove duplicates by fullName
  const unique = [];
  const seen = new Set();
  for (const repo of allRepos) {
    if (!seen.has(repo.fullName)) {
      seen.add(repo.fullName);
      unique.push(repo);
    }
  }
  
  return unique.slice(0, 15); // Top 15 unique repos
}

async function sendNotification(item) {
  // Notify for CRITICAL and HIGH items (score 50+)
  if (!['CRITICAL', 'HIGH'].includes(item.significance?.tier)) return;
  
  const tierEmoji = item.significance.tier === 'CRITICAL' ? '🚨' : '🔴';
  const tierLabel = item.significance.tier === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
  const emoji = item.type === 'paper' ? '📄' : '🐙';
  const message = `${tierEmoji} **${tierLabel} AI ${item.type.toUpperCase()}**\n\n**${item.title.substring(0, 100)}**${item.title.length > 100 ? '...' : ''}\n\nScore: ${item.significance.score}/100\nWhy: ${item.significance.factors.join(', ')}\n\n${item.url}`;
  
  console.log(`\n🔔 NOTIFICATION:\n${message}\n`);
  // Actual notification would go here via Telegram/Discord/Slack
}

async function processGitHubRepo(repo) {
  console.log(`Processing GH repo: ${repo.title}`);
  
  let apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    try {
      const authFile = '/home/n8garvie/.openclaw/agents/main/agent/auth-profiles.json';
      const auth = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      apiKey = auth?.profiles?.['anthropic:default']?.key;
    } catch {}
  }
  
  const prompt = `Summarize this GitHub AI project in plain English for a senior product designer.

Project: ${repo.fullName}
Description: ${repo.description}
Language: ${repo.language}
Stars: ${repo.stars}
Topics: ${repo.topics.join(', ')}

Provide:
1. **What it is** - One sentence
2. **Why it matters** - What's the innovation?
3. **Key capabilities** - What can it do?
4. **Practical impact** - Who would use this and why?

Conversational tone, no jargon.`;

  let summary = repo.description;
  
  if (apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        summary = result.content[0].text;
      }
    } catch (err) {
      console.error('  Claude summary failed:', err.message);
    }
  }
  
  const record = {
    id: repo.id,
    type: 'github',
    title: repo.title,
    fullName: repo.fullName,
    summary,
    stars: repo.stars,
    forks: repo.forks || 0,
    language: repo.language,
    url: repo.url,
    topics: repo.topics,
    pushedAt: repo.pushedAt,
    processedAt: new Date().toISOString()
  };
  
  // Calculate significance
  const sig = calculateSignificance(record);
  record.significance = sig;
  
  const filePath = path.join(MEMORY_DIR, `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  // Send notification if critical
  if (sig.notify) {
    await sendNotification(record);
  }
  
  return record;
}

async function generateDigest(items) {
  const critical = items.filter(i => i.significance?.tier === 'CRITICAL');
  const high = items.filter(i => i.significance?.tier === 'HIGH');
  const medium = items.filter(i => i.significance?.tier === 'MEDIUM');
  
  const digest = {
    date: new Date().toISOString(),
    critical: critical.map(i => ({ title: i.title, url: i.url, score: i.significance.score, factors: i.significance.factors })),
    high: high.map(i => ({ title: i.title, url: i.url, score: i.significance.score, factors: i.significance.factors })),
    medium: medium.map(i => ({ title: i.title, url: i.url, score: i.significance.score })),
    total: items.length
  };
  
  const digestPath = path.join(MEMORY_DIR, `digest-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(digestPath, JSON.stringify(digest, null, 2));
  
  return { critical, high, medium, digestPath };
}

async function main() {
  console.log('🔬 ArXiv + GitHub AI Scanner\n');
  
  const existingIds = await getExistingPaperIds();
  console.log(`Existing items in memory: ${existingIds.length}`);
  
  // Fetch ArXiv papers
  console.log('\n📄 Fetching ArXiv papers...');
  const papers = await fetchArxivPapers(3, 25);
  const newPapers = papers.filter(p => !existingIds.includes(p.id));
  console.log(`New papers found: ${newPapers.length}`);
  
  // Fetch GitHub repos
  const repos = await fetchGitHubTrendingAI();
  const existingGH = existingIds.filter(id => id.startsWith('github-'));
  const newRepos = repos.filter(r => !existingGH.includes(r.id));
  console.log(`New GitHub repos found: ${newRepos.length}`);
  
  const processed = [];
  
  // Process papers (limit for speed)
  for (const paper of newPapers.slice(0, 8)) {
    const record = await processPaper(paper);
    processed.push(record);
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Process repos
  for (const repo of newRepos.slice(0, 8)) {
    const record = await processGitHubRepo(repo);
    processed.push(record);
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Generate significance-based digest
  const { critical, high, medium, digestPath } = await generateDigest(processed);
  
  console.log(`\n✅ Processed ${processed.length} items`);
  console.log(`🚨 CRITICAL (${SIGNIFICANCE.CRITICAL}+): ${critical.length}`);
  console.log(`🔴 HIGH (${SIGNIFICANCE.HIGH}+): ${high.length}`);
  console.log(`🟡 MEDIUM (${SIGNIFICANCE.MEDIUM}+): ${medium.length}`);
  console.log(`⚪ LOW: ${processed.length - critical.length - high.length - medium.length}`);
  
  // Update index with significance tiers
  const indexPath = path.join(MEMORY_DIR, 'index.md');
  const indexContent = `# AI Research & Projects Index

Last updated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}

## 🚨 Critical (Score ${SIGNIFICANCE.CRITICAL}+)

${critical.map(i => `- **[${i.title.substring(0, 70)}${i.title.length > 70 ? '...' : ''}](${i.url})** (Score: ${i.significance.score})\n  - ${i.significance.factors.join(', ')}`).join('\n\n') || '*No critical items*'}

## 🔴 High Significance (Score ${SIGNIFICANCE.HIGH}-${SIGNIFICANCE.CRITICAL - 1})

${high.map(i => `- [${i.title.substring(0, 70)}${i.title.length > 70 ? '...' : ''}](${i.url}) (Score: ${i.significance.score})`).join('\n') || '*No high significance items*'}

## 🟡 Medium Significance

${medium.slice(0, 10).map(i => `- [${i.title.substring(0, 60)}${i.title.length > 60 ? '...' : ''}](${i.url})`).join('\n') || '*See full archive*'}

---
**Total scanned:** ${processed.length} | [View full digest](${path.basename(digestPath)})

*Scoring: HN mentions, GitHub stars, author reputation, recency, relevance to your interests*
`;
  
  fs.writeFileSync(indexPath, indexContent);
  
  // Summary output
  console.log('\n📊 Notable items:');
  [...critical, ...high].slice(0, 5).forEach(i => {
    console.log(`  ${i.significance.tier === 'CRITICAL' ? '🚨' : '🔴'} ${i.title.substring(0, 50)}... (${i.significance.score})`);
  });
}

main().catch(console.error);
