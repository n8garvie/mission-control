#!/usr/bin/env node
/**
 * Dribbble Inspiration Scraper
 * 
 * Daily scrape of top Dribbble shots for design inspiration.
 * Filters by tags relevant to Nathan's interests.
 * 
 * Schedule: Daily at 9 AM PST
 * Output: ~/NateMate/notes/NateMateNotes/Agent Saved/dribbble/
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SAVE_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/Agent Saved/dribbble';
const BASE_URL = 'https://dribbble.com';

// Search terms aligned with Nathan's interests
const SEARCH_TERMS = [
  'mobile app ui',
  'dashboard design',
  'ai interface',
  'watch app',
  'dark theme ui',
  'minimal interface',
  'design system',
  'productivity app',
  'finance app',
  'ios design'
];

// Ensure directory exists
fs.mkdirSync(SAVE_DIR, { recursive: true });

async function scrapeDribbble(term, limit = 5) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const searchUrl = `${BASE_URL}/search/${encodeURIComponent(term)}?timeframe=week`;
    console.log(`  Searching: "${term}"`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Extract shot data
    const shots = await page.evaluate((max, searchTerm) => {
      const items = [];
      const shotElements = document.querySelectorAll('li.shot-thumbnail, .shot-thumbnail, [data-testid="shot-thumbnail"]');
      
      shotElements.forEach((el, i) => {
        if (i >= max) return;
        
        const img = el.querySelector('img');
        const link = el.querySelector('a');
        const titleEl = el.querySelector('[data-testid="shot-title"], .shot-title, h2, h3');
        const designerEl = el.querySelector('[data-testid="designer-name"], .designer-name, .display-name');
        
        if (img && img.src) {
          items.push({
            title: titleEl?.textContent?.trim() || 'Untitled',
            designer: designerEl?.textContent?.trim() || 'Unknown',
            imageUrl: img.src.replace(/_4x\./, '_2x.').replace(/_2x\./, '_1x.'),
            shotUrl: link?.href?.startsWith('http') ? link.href : `https://dribbble.com${link?.getAttribute('href') || ''}`,
            searchTerm: searchTerm
          });
        }
      });
      
      return items;
    }, limit, term);
    
    await browser.close();
    return shots;
  } catch (err) {
    console.error(`  Error scraping "${term}":`, err.message);
    await browser.close();
    return [];
  }
}

async function scrapePopular(limit = 10) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('  Fetching popular shots...');
    
    await page.goto(`${BASE_URL}/shots/popular`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const shots = await page.evaluate((max) => {
      const items = [];
      const shotElements = document.querySelectorAll('li.shot-thumbnail, .shot-thumbnail, [data-testid="shot-thumbnail"]');
      
      shotElements.forEach((el, i) => {
        if (i >= max) return;
        
        const img = el.querySelector('img');
        const link = el.querySelector('a');
        const titleEl = el.querySelector('[data-testid="shot-title"], .shot-title, h2, h3');
        const designerEl = el.querySelector('[data-testid="designer-name"], .designer-name, .display-name');
        
        if (img && img.src) {
          items.push({
            title: titleEl?.textContent?.trim() || 'Untitled',
            designer: designerEl?.textContent?.trim() || 'Unknown',
            imageUrl: img.src.replace(/_4x\./, '_2x.').replace(/_2x\./, '_1x.'),
            shotUrl: link?.href?.startsWith('http') ? link.href : `https://dribbble.com${link?.getAttribute('href') || ''}`,
            searchTerm: 'popular'
          });
        }
      });
      
      return items;
    }, limit);
    
    await browser.close();
    return shots;
  } catch (err) {
    console.error('  Error scraping popular:', err.message);
    await browser.close();
    return [];
  }
}

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return false;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('🎨 Dribbble Inspiration Scraper\n');
  console.log(`Date: ${new Date().toLocaleDateString('en-US')}\n`);
  
  const allShots = [];
  const todayDir = path.join(SAVE_DIR, new Date().toISOString().split('T')[0]);
  fs.mkdirSync(todayDir, { recursive: true });
  
  // First: scrape popular shots
  const popularShots = await scrapePopular(15);
  allShots.push(...popularShots);
  console.log(`  Found ${popularShots.length} popular shots\n`);
  
  // Rate limit
  await new Promise(r => setTimeout(r, 2000));
  
  // Then: scrape each search term (fewer results since we have popular)
  for (const term of SEARCH_TERMS.slice(0, 5)) {
    const shots = await scrapeDribbble(term, 2);
    allShots.push(...shots);
    console.log(`  Found ${shots.length} shots\n`);
    
    // Rate limit between searches
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`Total shots found: ${allShots.length}\n`);
  
  // Download images
  let downloaded = 0;
  const shotData = [];
  
  for (let i = 0; i < allShots.length; i++) {
    const shot = allShots[i];
    const filename = `shot-${String(i + 1).padStart(3, '0')}.jpg`;
    const filepath = path.join(todayDir, filename);
    
    process.stdout.write(`  Downloading ${i + 1}/${allShots.length}... `);
    
    const success = await downloadImage(shot.imageUrl, filepath);
    
    if (success) {
      downloaded++;
      console.log('✓');
      shotData.push({
        ...shot,
        localFile: filepath,
        savedFilename: filename
      });
    } else {
      console.log('✗');
    }
    
    // Rate limit downloads
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Save metadata
  const metadataPath = path.join(todayDir, 'shots.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    date: new Date().toISOString(),
    totalFound: allShots.length,
    downloaded: downloaded,
    shots: shotData
  }, null, 2));
  
  // Create summary markdown
  const summaryPath = path.join(SAVE_DIR, `daily-summary-${new Date().toISOString().split('T')[0]}.md`);
  const summary = `# Dribbble Inspiration - ${new Date().toLocaleDateString('en-US')}

**${downloaded} shots downloaded** from ${SEARCH_TERMS.length} search terms

## Today's Collection

${shotData.map((shot, i) => `### ${i + 1}. ${shot.title}
- **Designer:** ${shot.designer}
- **Source:** [Dribbble](${shot.shotUrl})
- **Search:** ${shot.searchTerm}
- **File:** [${shot.savedFilename}](./${new Date().toISOString().split('T')[0]}/${shot.savedFilename})

![${shot.title}](./${new Date().toISOString().split('T')[0]}/${shot.savedFilename})
`).join('\n')}

---
*Auto-generated by Dribbble Inspiration Scraper*
`;
  
  fs.writeFileSync(summaryPath, summary);
  
  console.log(`\n✅ Complete:`);
  console.log(`  Downloaded: ${downloaded}/${allShots.length} shots`);
  console.log(`  Saved to: ${todayDir}`);
  console.log(`  Summary: ${summaryPath}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
