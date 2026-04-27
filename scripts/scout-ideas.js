#!/usr/bin/env node
/**
 * Scout Agent - Web Research & Idea Generation
 * 
 * Searches Reddit, Hacker News, Product Hunt, and trending topics
 * to generate fresh product ideas. Uses Claude to synthesize findings.
 * 
 * Usage: node scout-ideas.js
 * Env: CONVEX_DEPLOY_KEY (required for saving to dashboard)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const llm = require('./lib/llm');

const SCOUT_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/agents/scout-ideas';
const DASHBOARD_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/dashboard';

// Optional secrets file for local dev convenience
const SECRETS_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/config/secrets.json';
let SECRETS = {};
if (fs.existsSync(SECRETS_FILE)) {
  try { SECRETS = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')); } catch (err) {
    console.error(`Failed to parse ${SECRETS_FILE}: ${err.message}`);
  }
}

const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || SECRETS.convex?.deployKey;
if (!CONVEX_DEPLOY_KEY) {
  console.error('CONVEX_DEPLOY_KEY missing. Set the env var or populate config/secrets.json.');
  process.exit(1);
}

const SCOUT_DRY_RUN = process.env.SCOUT_DRY_RUN === '1' || process.env.SCOUT_DRY_RUN === 'true';

// Diverse sources to search
const SOURCES = {
  reddit: [
    // Tech & building
    { sub: 'SideProject', search: 'launched OR built OR "looking for" OR "wish there was"' },
    { sub: 'indiehackers', search: 'revenue OR launched OR "pain point"' },
    { sub: 'webdev', search: '"I wish" OR "frustrated" OR "alternative to"' },
    { sub: 'selfhosted', search: 'looking OR alternative OR recommend' },
    { sub: 'macapps', search: 'looking OR recommend OR alternative' },
    { sub: 'Entrepreneur', search: '"small business" OR automation OR "save time"' },
    // Nathan's interests
    { sub: 'watches', search: 'tracker OR app OR tool OR spreadsheet' },
    { sub: 'espresso', search: 'app OR tracker OR "dial in" OR log' },
    { sub: 'Porsche', search: 'tool OR app OR compare OR value' },
    { sub: 'homeassistant', search: 'dashboard OR integration OR "wish"' },
    // Design & AI
    { sub: 'UI_Design', search: 'tool OR generator OR "AI" OR automate' },
    { sub: 'artificial', search: 'wrapper OR tool OR "built with" OR API' },
    // Finance & investing
    { sub: 'fatFIRE', search: 'tool OR tracker OR app OR automate' },
    { sub: 'realestateinvesting', search: 'tool OR calculator OR analyze' },
  ],
  hackerNews: [
    'Show HN',
    'Ask HN: What are you working on',
    'Launch HN',
  ],
  productHunt: [
    'developer-tools',
    'productivity',
    'design-tools',
    'artificial-intelligence',
    'fintech',
    'no-code',
  ],
  trends: [
    'trending AI tools 2026',
    'micro SaaS ideas profitable',
    'underserved niches software',
    'boring businesses making money',
    'API first products trending',
  ]
};

async function fetchRedditPosts(subreddit, query, limit = 5) {
  try {
    // Honour the configured search query when present; otherwise fall back to /new
    const url = query
      ? `https://old.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}`
      : `https://old.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NateMateBot/1.0)' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data?.data?.children || []).map(post => ({
      title: post.data.title,
      selftext: (post.data.selftext || '').substring(0, 500),
      score: post.data.score,
      url: `https://reddit.com${post.data.permalink}`,
      subreddit: subreddit,
      source: 'reddit'
    }));
  } catch (err) {
    console.error(`  Reddit r/${subreddit} failed:`, err.message);
    return [];
  }
}

async function fetchHackerNews(query, limit = 5) {
  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}&numericFilters=points>5`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.hits || []).map(hit => ({
      title: hit.title,
      selftext: hit.story_text ? hit.story_text.substring(0, 500) : '',
      score: hit.points,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'hackernews'
    }));
  } catch (err) {
    console.error(`  ⚠️ HN search failed:`, err.message);
    return [];
  }
}

async function fetchProductHunt(category) {
  // ProductHunt requires a developer token + GraphQL request. When PH_TOKEN is
  // not set we no-op rather than emit fake placeholder rows that pollute the
  // research digest. Wire up GraphQL here when PRODUCTHUNT_TOKEN is configured.
  const token = process.env.PRODUCTHUNT_TOKEN || SECRETS.producthunt?.token;
  if (!token) return [];

  try {
    const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query ($cat: String!) {
          posts(topic: $cat, order: VOTES, first: 10) {
            edges { node { name tagline url votesCount } }
          }
        }`,
        variables: { cat: category },
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const edges = data?.data?.posts?.edges || [];
    return edges.map(({ node }) => ({
      title: node.name,
      selftext: node.tagline || '',
      score: node.votesCount || 0,
      url: node.url,
      source: 'producthunt',
    }));
  } catch (err) {
    console.error('  ProductHunt failed:', err.message);
    return [];
  }
}

async function fetchLobsters(limit = 10) {
  try {
    const response = await fetch('https://lobste.rs/hottest.json');
    if (!response.ok) return [];
    const data = await response.json();
    return data.slice(0, limit).map(post => ({
      title: post.title,
      selftext: post.description || '',
      score: post.score,
      url: post.url || post.short_id_url,
      source: 'lobsters'
    }));
  } catch (err) {
    console.error('  ⚠️ Lobsters failed:', err.message);
    return [];
  }
}

async function fetchGitHubTrending() {
  try {
    // Trending = high-star repos created in the last 7 days. The original code
    // had a hardcoded date that goes stale on day one; this stays current.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const response = await fetch(
      `https://api.github.com/search/repositories?q=created:>${sevenDaysAgo}&sort=stars&order=desc&per_page=10`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map(repo => ({
      title: `${repo.name}: ${repo.description || ''}`.substring(0, 100),
      selftext: repo.description || '',
      score: repo.stargazers_count,
      url: repo.html_url,
      source: 'github-trending'
    }));
  } catch (err) {
    console.error('  ⚠️ GitHub trending failed:', err.message);
    return [];
  }
}

async function gatherResearch() {
  console.log('Scout: gathering research from across the web...\n');

  const allPosts = [];

  // Reddit. Configurable via SCOUT_REDDIT_LIMIT (default: scan all configured subs).
  const redditLimit = parseInt(process.env.SCOUT_REDDIT_LIMIT || `${SOURCES.reddit.length}`, 10);
  console.log(`Reddit (${redditLimit}/${SOURCES.reddit.length} subreddits)...`);
  for (const { sub, search } of SOURCES.reddit.slice(0, redditLimit)) {
    process.stdout.write(`  r/${sub}... `);
    const posts = await fetchRedditPosts(sub, search, 5);
    allPosts.push(...posts);
    console.log(`${posts.length} posts`);
    await sleep(2000); // gentle rate limit
  }
  
  console.log('\nHacker News...');
  for (const query of SOURCES.hackerNews) {
    process.stdout.write(`  "${query}"... `);
    const posts = await fetchHackerNews(query, 8);
    allPosts.push(...posts);
    console.log(`${posts.length} posts`);
    await sleep(500);
  }

  console.log('\nLobsters...');
  process.stdout.write('  Hottest... ');
  const lobsterPosts = await fetchLobsters(10);
  allPosts.push(...lobsterPosts);
  console.log(`${lobsterPosts.length} posts`);

  console.log('\nGitHub trending...');
  process.stdout.write('  Last 7 days... ');
  const ghPosts = await fetchGitHubTrending();
  allPosts.push(...ghPosts);
  console.log(`${ghPosts.length} repos`);

  // ProductHunt only fires when a token is configured.
  if (process.env.PRODUCTHUNT_TOKEN || SECRETS.producthunt?.token) {
    console.log('\nProduct Hunt...');
    for (const cat of SOURCES.productHunt) {
      process.stdout.write(`  ${cat}... `);
      const phPosts = await fetchProductHunt(cat);
      allPosts.push(...phPosts);
      console.log(`${phPosts.length} posts`);
      await sleep(500);
    }
  }

  console.log(`\nTotal posts gathered: ${allPosts.length}`);
  return allPosts;
}

async function getExistingIdeas() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:list 2>/dev/null`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY } }
    );
    return JSON.parse(output).map(i => i.title.toLowerCase());
  } catch {
    return [];
  }
}

async function getRejectedIdeas() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:listRejected 2>/dev/null`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY } }
    );
    return JSON.parse(output).map(i => i.title.toLowerCase());
  } catch {
    return [];
  }
}

// Tokenize a string into a normalized bag for similarity comparison.
const STOPWORDS = new Set(['a','an','the','of','for','to','and','in','on','with','at','by','as','is','are','app','tool','platform']);
function tokenize(s) {
  return new Set(
    String(s).toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOPWORDS.has(t))
  );
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function isDuplicate(title, knownTitles, threshold = 0.6) {
  const t = tokenize(title);
  for (const k of knownTitles) {
    if (jaccard(t, tokenize(k)) >= threshold) return k;
  }
  return null;
}

// Pick the 1-3 strongest source posts that inspired a given idea — used as
// review evidence in the dashboard so the human reviewer can click through.
function pickEvidence(idea, posts, max = 3) {
  const ideaTokens = tokenize(`${idea.title} ${idea.description} ${idea.mvpScope}`);
  return posts
    .map(p => ({ post: p, score: jaccard(tokenize(p.title + ' ' + (p.selftext || '')), ideaTokens) * (1 + Math.log10(1 + Math.max(0, p.score || 0))) }))
    .filter(x => x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ post }) => ({
      sourceUrl:    post.url || '',
      sourceTitle:  (post.title || '').substring(0, 200),
      score:        post.score || 0,
      capturedAt:   Date.now(),
    }));
}

// Quality gate: drop ideas that look like placeholders.
function passesQualityBar(idea) {
  if (!idea.title || idea.title.length < 4) return false;
  if (!idea.targetAudience || idea.targetAudience.length < 20) return false;
  if (!idea.mvpScope || idea.mvpScope.length < 30) return false;
  if (/^TBD/i.test(idea.mvpScope.trim())) return false;
  return true;
}

async function generateIdeasFromResearch(posts, existingTitles, rejectedTitles) {
  console.log('\nScout: synthesizing research via LLM...\n');

  const researchDigest = posts
    .filter(p => p.title && p.title.length > 10)
    .slice(0, 50)
    .map(p => {
      let line = `[${p.source}${p.subreddit ? ` r/${p.subreddit}` : ''}] (score:${p.score}) ${p.title}`;
      if (p.selftext && p.selftext.length > 20) line += `\n  ${p.selftext.substring(0, 300)}`;
      return line;
    })
    .join('\n\n');

  const existingList = existingTitles.length > 0 ? existingTitles.join(', ') : 'None';
  const rejectedList = rejectedTitles.length > 0 ? rejectedTitles.join(', ') : 'None';

  const prompt = `You are Scout, an AI product idea researcher. You've just scanned posts from Reddit, Hacker News, Lobsters, GitHub Trending, and Product Hunt.

Your job: Synthesize these raw signals into 5-7 concrete, buildable product ideas that a solo developer could ship as a side project in 1-2 weeks.

## Research Digest

${researchDigest}

## Context

- The builder is Nathan, a senior product design director who builds side projects
- He's interested in: watches, Porsche 997.2, espresso, smart home, AI tools, design tools, finance
- He values: clean UI, data-driven tools, things that save time, premium feel
- He builds with: Next.js, Convex, Vercel, Tailwind, AI APIs

## Already in pipeline (DO NOT suggest these):
${existingList}

## Previously rejected (DO NOT suggest these):
${rejectedList}

## Requirements

For each idea, return a JSON array. Each idea must have:
- title: Short, catchy product name (3-5 words max)
- description: 2-3 sentence pitch explaining the problem and solution
- targetAudience: Who specifically would use this (concrete persona, 20+ chars)
- mvpScope: What the MVP includes (be specific: "X page with Y feature + Z integration", 30+ chars)
- potential: "low" | "medium" | "high" | "moonshot"
- source: Which post(s) inspired this (URL or description)
- tags: Array of 2-4 relevant tags

## Rules
1. DO NOT just restate post titles. Synthesize multiple signals into novel ideas.
2. Each idea must be buildable in 1-2 weeks by one developer.
3. Prefer ideas with clear monetization (freemium, one-time purchase, API usage).
4. At least 1 idea should relate to Nathan's personal interests.
5. At least 1 idea should be an AI-powered tool.
6. Names should be memorable and brandable.

Return ONLY a valid JSON array. No markdown, no explanation.`;

  let text;
  try {
    const result = await llm.complete({
      role: 'balanced',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 3000,
      temperature: 0.7,
    });
    text = result.text;
    console.log(`  LLM ok (${result.usage.inputTokens}in/${result.usage.outputTokens}out)`);
  } catch (err) {
    console.error(`  LLM call failed: ${err.message}`);
    return fallbackExtract(posts, existingTitles, rejectedTitles);
  }

  let ideas;
  try {
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    ideas = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('  Failed to parse LLM response as JSON');
    console.error('  Response:', text.substring(0, 200));
    return fallbackExtract(posts, existingTitles, rejectedTitles);
  }

  const knownTitles = [...existingTitles, ...rejectedTitles];
  const dropped = { dup: 0, quality: 0 };

  const cleaned = ideas
    .filter(idea => idea.title && idea.description && idea.targetAudience)
    .map(idea => {
      const evidence = pickEvidence(idea, posts);
      const discoverySources = Array.from(new Set(
        posts.length > 0
          ? evidence.map(e => {
              if (/reddit\.com/.test(e.sourceUrl)) return 'reddit';
              if (/news\.ycombinator/.test(e.sourceUrl)) return 'hackernews';
              if (/lobste\.rs/.test(e.sourceUrl)) return 'lobsters';
              if (/github\.com/.test(e.sourceUrl)) return 'github';
              if (/producthunt\.com/.test(e.sourceUrl)) return 'producthunt';
              return null;
            }).filter(Boolean)
          : []
      ));
      return {
        title: idea.title.substring(0, 80),
        description: idea.description.substring(0, 500),
        targetAudience: idea.targetAudience.substring(0, 200),
        mvpScope: (idea.mvpScope || '').substring(0, 300),
        potential: ['low', 'medium', 'high', 'moonshot'].includes(idea.potential) ? idea.potential : 'medium',
        source: (idea.source || 'web-research').substring(0, 300),
        tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 5) : ['web-research'],
        evidence,
        discoverySources,
      };
    })
    .filter(idea => {
      const dup = isDuplicate(idea.title, knownTitles);
      if (dup) {
        console.log(`  Dropping duplicate idea "${idea.title}" (matched "${dup}")`);
        dropped.dup++;
        return false;
      }
      if (!passesQualityBar(idea)) {
        console.log(`  Dropping low-quality idea "${idea.title}" (audience/mvp too thin)`);
        dropped.quality++;
        return false;
      }
      knownTitles.push(idea.title);
      return true;
    });

  console.log(`  Kept ${cleaned.length} ideas (dropped ${dropped.dup} duplicates, ${dropped.quality} below quality bar)`);
  return cleaned;
}

// Fallback: basic extraction without Claude
function fallbackExtract(posts, existingTitles, rejectedTitles) {
  console.log('  📝 Using basic extraction (no Claude)...');
  const seenTitles = new Set([...existingTitles, ...rejectedTitles]);
  
  return posts
    .filter(p => p.score > 5 && p.title.length > 15)
    .filter(p => !seenTitles.has(p.title.toLowerCase()))
    .slice(0, 5)
    .map(p => ({
      title: p.title.substring(0, 60),
      description: p.selftext || p.title,
      targetAudience: 'Tech-savvy professionals',
      mvpScope: 'TBD - needs brief expansion',
      potential: p.score > 100 ? 'high' : 'medium',
      source: p.url,
      tags: [p.source || 'web']
    }));
}

async function saveScoutedIdeas(ideas) {
  if (SCOUT_DRY_RUN) {
    console.log(`\n[dry-run] Would save ${ideas.length} ideas with pipelineStatus="scouted":`);
    ideas.forEach((idea, i) => {
      console.log(`  ${i + 1}. ${idea.title} (${idea.potential}) — ${idea.targetAudience}`);
    });
    return ideas.length;
  }

  console.log(`\nSaving ${ideas.length} ideas as scouted (awaiting human review)...\n`);

  let saved = 0;
  for (const idea of ideas) {
    try {
      const args = JSON.stringify({
        title: idea.title,
        description: idea.description,
        targetAudience: idea.targetAudience,
        mvpScope: idea.mvpScope,
        potential: idea.potential,
        source: idea.source,
        tags: idea.tags,
        evidence: idea.evidence,
        discoverySources: idea.discoverySources,
      });

      execSync(
        `cd "${DASHBOARD_DIR}" && npx convex run ideas:create '${args.replace(/'/g, "'\\''")}'`,
        { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
      );

      console.log(`  ${idea.title} — scouted (awaiting review)`);
      saved++;
    } catch (err) {
      console.error(`  Failed: ${idea.title} - ${err.message.substring(0, 100)}`);
    }
  }

  return saved;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const mode = SCOUT_DRY_RUN ? 'dry-run' : 'live';
  console.log('Scout Agent — Idea research sprint');
  console.log(`Mode: ${mode} (ideas are saved as "scouted" awaiting human approval)`);
  console.log(`Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`);

  try {
    const posts = await gatherResearch();

    const existing = await getExistingIdeas();
    const rejected = await getRejectedIdeas();
    console.log(`\nExisting ideas: ${existing.length}, Rejected: ${rejected.length}`);

    const ideas = await generateIdeasFromResearch(posts, existing, rejected);
    console.log(`\nGenerated ${ideas.length} new ideas`);

    if (ideas.length === 0) {
      console.log('\nNo new ideas this sprint. Try again later.');
      return;
    }

    const saved = await saveScoutedIdeas(ideas);

    if (!SCOUT_DRY_RUN) {
      const memoryDir = path.join(SCOUT_DIR, 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      const logFile = path.join(memoryDir, `sprint-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(logFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        postsScanned: posts.length,
        ideasGenerated: ideas.length,
        ideasSaved: saved,
        ideas: ideas
      }, null, 2));
      console.log(`  Sprint log: ${logFile}`);
    }

    const dashboardUrl = process.env.MISSION_CONTROL_URL || 'https://mission-control.vercel.app';
    console.log('\nScout sprint complete');
    console.log(`  Posts scanned:    ${posts.length}`);
    console.log(`  Ideas generated:  ${ideas.length}`);
    console.log(`  Ideas saved:      ${saved}`);
    console.log(`  Review at:        ${dashboardUrl}/ideas`);

    notifyTelegramSummary({ postsScanned: posts.length, ideasSaved: saved, dashboardUrl });
  } catch (err) {
    console.error('Scout failed:', err.message);
    process.exit(1);
  }
}

function notifyTelegramSummary({ postsScanned, ideasSaved, dashboardUrl }) {
  if (SCOUT_DRY_RUN) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || SECRETS.telegram?.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || SECRETS.telegram?.chatId;
  if (!botToken || !chatId || ideasSaved === 0) return;

  const text = `Scout sprint complete: scanned ${postsScanned} posts, saved ${ideasSaved} new ideas. Review at ${dashboardUrl}/ideas`;
  try {
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" ` +
      `-d "chat_id=${chatId}" --data-urlencode "text=${text}"`,
      { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
    );
  } catch (err) {
    console.error(`  Telegram summary failed: ${err.message.substring(0, 100)}`);
  }
}

main();
