#!/usr/bin/env node
/**
 * ArXiv PDF Downloader for Wiki Inbox
 * 
 * Connects to morning briefing system to automatically download
 * notable AI research papers as PDFs into the wiki inbox.
 * 
 * Usage:
 *   node arxiv-to-wiki.js                    # Process recent papers
 *   node arxiv-to-wiki.js --today            # Process today's papers only
 *   node arxiv-to-wiki.js --score 70         # Only papers with score >= 70
 *   node arxiv-to-wiki.js --dry-run          # Show what would be downloaded
 * 
 * Schedule: Run after morning briefing generation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ARXIV_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/memory/arxiv';
const WIKI_INBOX = '/home/n8garvie/NateMate/notes/NateMateNotes/SavedWiki/inbox';
const WIKI_RAW = '/home/n8garvie/NateMate/notes/NateMateNotes/SavedWiki/raw/articles';
const MIN_SIGNIFICANCE_SCORE = 50;  // Minimum score to auto-download

function getTodayDate() {
  const d = new Date();
  const pstStr = d.toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
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

// Extract arXiv ID from various URL formats
function extractArxivId(url) {
  if (!url) return null;
  
  // Match patterns like:
  // https://arxiv.org/abs/2507.20414
  // https://arxiv.org/pdf/2507.20414.pdf
  // arxiv.org/abs/2507.20414
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)(?:\.pdf)?/);
  return match ? match[1] : null;
}

// Get PDF URL from arXiv ID
function getPdfUrl(arxivId) {
  return `https://arxiv.org/pdf/${arxivId}.pdf`;
}

// Get abstract URL from arXiv ID
function getAbstractUrl(arxivId) {
  return `https://arxiv.org/abs/${arxivId}`;
}

// Create safe filename from title
function createSafeFilename(title, arxivId) {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .replace(/-+$/, '');
  return `${safe}-${arxivId}.pdf`;
}

// Create markdown inbox entry for the paper
function createInboxEntry(paper, pdfPath, arxivId) {
  const slug = createSafeFilename(paper.title, arxivId).replace('.pdf', '');
  const filename = `${slug}.md`;
  const filepath = path.join(WIKI_INBOX, filename);
  
  const content = `---
source_type: article
url: ${getAbstractUrl(arxivId)}
timestamp: ${new Date().toISOString()}
caption: ArXiv AI research paper - Significance score: ${paper.significance?.score || 'N/A'}/100. ${paper.significance?.reasoning?.substring(0, 100) || ''}...
fetched_title: ${paper.title}
arxiv_id: ${arxivId}
pdf_path: ${pdfPath}
significance_score: ${paper.significance?.score || 0}
---

# ${paper.title}

**ArXiv ID:** [${arxivId}](${getAbstractUrl(arxivId)})  
**PDF:** [Download](${getPdfUrl(arxivId)})  
**Significance Score:** ${paper.significance?.score || 'N/A'}/100

## Authors
${paper.authors?.map(a => `- ${a}`).join('\n') || 'Not available'}

## Abstract
${paper.abstract || paper.summary || 'Not available'}

## Significance Analysis
${paper.significance?.reasoning || 'Not analyzed'}

## Categories
${paper.categories?.join(', ') || 'Not categorized'}

## Publication Date
${paper.published || paper.date || 'Unknown'}

---

*PDF downloaded to: \`${pdfPath}\`*
`;

  fs.writeFileSync(filepath, content);
  return filepath;
}

// Download PDF from arXiv
function downloadPdf(arxivId, outputPath) {
  const pdfUrl = getPdfUrl(arxivId);
  
  try {
    // Use curl to download with proper headers and follow redirects
    execSync(
      `curl -s -L -o "${outputPath}" "${pdfUrl}"`,
      { stdio: 'pipe', timeout: 60000 }
    );
    
    // Verify it's a valid PDF (check magic bytes)
    const fd = fs.openSync(outputPath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    const isPdf = buffer.toString('hex') === '25504446'; // %PDF
    
    if (!isPdf) {
      // Not a PDF, might be HTML error page
      fs.unlinkSync(outputPath);
      return { success: false, error: 'Downloaded file is not a valid PDF' };
    }
    
    const stats = fs.statSync(outputPath);
    return { success: true, size: stats.size };
  } catch (err) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    return { success: false, error: err.message };
  }
}

// Get papers from ArXiv directory
function getPapers(options = {}) {
  const papers = [];
  
  if (!fs.existsSync(ARXIV_DIR)) {
    console.log(`⚠️  ArXiv directory not found: ${ARXIV_DIR}`);
    return papers;
  }
  
  const files = fs.readdirSync(ARXIV_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('digest') && !f.includes('index'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(ARXIV_DIR, a));
      const statB = fs.statSync(path.join(ARXIV_DIR, b));
      return statB.mtime - statA.mtime;
    });
  
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ARXIV_DIR, file), 'utf-8'));
      
      // Filter by date if --today flag
      if (options.todayOnly) {
        const paperDate = data.date || data.published?.split('T')[0];
        if (paperDate !== today && paperDate !== yesterday) {
          continue;
        }
      }
      
      // Filter by significance score
      const minScore = options.minScore || MIN_SIGNIFICANCE_SCORE;
      if ((data.significance?.score || 0) < minScore) {
        continue;
      }
      
      papers.push(data);
    } catch (err) {
      console.error(`Failed to parse ${file}:`, err.message);
    }
  }
  
  return papers;
}

// Check if paper already downloaded
function isAlreadyDownloaded(arxivId) {
  const files = fs.readdirSync(WIKI_INBOX)
    .filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(WIKI_INBOX, file), 'utf-8');
      if (content.includes(`arxiv_id: ${arxivId}`)) {
        return true;
      }
    } catch {}
  }
  
  // Also check raw directory for PDFs
  if (fs.existsSync(WIKI_RAW)) {
    const rawFiles = fs.readdirSync(WIKI_RAW);
    if (rawFiles.some(f => f.includes(arxivId))) {
      return true;
    }
  }
  
  return false;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    todayOnly: args.includes('--today'),
    minScore: args.includes('--score') ? parseInt(args[args.indexOf('--score') + 1]) : MIN_SIGNIFICANCE_SCORE
  };
  
  console.log('📚 ArXiv to Wiki Inbox Downloader\n');
  console.log(`Options: ${options.dryRun ? 'DRY RUN ' : ''}${options.todayOnly ? 'TODAY ONLY ' : ''}MIN_SCORE=${options.minScore}\n`);
  
  // Ensure directories exist
  fs.mkdirSync(WIKI_INBOX, { recursive: true });
  fs.mkdirSync(WIKI_RAW, { recursive: true });
  
  // Get papers
  const papers = getPapers(options);
  console.log(`Found ${papers.length} papers matching criteria\n`);
  
  if (papers.length === 0) {
    console.log('✓ No new papers to download');
    return;
  }
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const paper of papers) {
    const arxivId = extractArxivId(paper.link || paper.url);
    
    if (!arxivId) {
      console.log(`⚠️  Could not extract arXiv ID from: ${paper.title}`);
      failed++;
      continue;
    }
    
    console.log(`\n📄 ${paper.title}`);
    console.log(`   ArXiv ID: ${arxivId}`);
    console.log(`   Score: ${paper.significance?.score || 'N/A'}/100`);
    
    // Check if already downloaded
    if (isAlreadyDownloaded(arxivId)) {
      console.log(`   ⏭️  Already in wiki, skipping`);
      skipped++;
      continue;
    }
    
    if (options.dryRun) {
      console.log(`   🔍 Would download PDF and create inbox entry`);
      downloaded++;
      continue;
    }
    
    // Download PDF
    const pdfFilename = createSafeFilename(paper.title, arxivId);
    const pdfPath = path.join(WIKI_RAW, pdfFilename);
    
    console.log(`   ⬇️  Downloading PDF...`);
    const result = downloadPdf(arxivId, pdfPath);
    
    if (!result.success) {
      console.log(`   ❌ Failed: ${result.error}`);
      failed++;
      continue;
    }
    
    console.log(`   ✓ Downloaded (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Create inbox entry
    const inboxPath = createInboxEntry(paper, pdfPath, arxivId);
    console.log(`   ✓ Created inbox entry: ${path.basename(inboxPath)}`);
    
    downloaded++;
  }
  
  console.log(`\n---\n`);
  console.log(`📊 Summary:`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Skipped (already have): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  
  if (!options.dryRun && downloaded > 0) {
    console.log(`\n📝 Next steps:`);
    console.log(`   Run: cd ~/NateMate/notes/NateMateNotes/SavedWiki && python3 scripts/ingest.py`);
    console.log(`   Or:  /wiki ingest (in Telegram)`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
