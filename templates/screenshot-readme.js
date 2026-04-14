#!/usr/bin/env node
/**
 * screenshot-readme.js - Automated screenshot capture for README documentation
 * 
 * This script:
 * 1. Starts a Next.js dev server (if not already running)
 * 2. Captures a full-page screenshot using Playwright
 * 3. Adds the screenshot to the README.md
 * 4. Commits and pushes the changes to GitHub
 * 
 * Usage:
 *   node screenshot-readme.js [options]
 * 
 * Options:
 *   --port <number>      Port to use (default: 3000, finds available if taken)
 *   --output <filename>  Screenshot filename (default: screenshot.png)
 *   --skip-server        Don't start server (assume already running)
 *   --commit             Auto-commit and push changes
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const options = {
  port: 3000,
  output: 'screenshot.png',
  skipServer: false,
  commit: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--port':
      options.port = parseInt(args[++i], 10);
      break;
    case '--output':
      options.output = args[++i];
      break;
    case '--skip-server':
      options.skipServer = true;
      break;
    case '--commit':
      options.commit = true;
      break;
  }
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  try {
    execSync(`lsof -Pi :${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 10; port++) {
    if (!checkPort(port)) {
      return port;
    }
  }
  return null;
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      execSync(`curl -s ${url} > /dev/null`, { stdio: 'ignore' });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function captureScreenshot(url, outputPath) {
  log(`📷 Capturing screenshot from ${url}...`, 'blue');
  
  try {
    execSync(
      `npx playwright screenshot --full-page --wait-for-timeout 3000 --color-scheme=dark "${url}" "${outputPath}"`,
      { stdio: 'inherit' }
    );
    return fs.existsSync(outputPath);
  } catch (error) {
    log(`❌ Screenshot capture failed: ${error.message}`, 'red');
    return false;
  }
}

function addScreenshotToReadme(readmePath, screenshotName) {
  if (!fs.existsSync(readmePath)) {
    log(`⚠️  README.md not found at ${readmePath}`, 'yellow');
    return false;
  }

  const content = fs.readFileSync(readmePath, 'utf-8');
  
  // Check if screenshot already exists
  if (content.includes(screenshotName)) {
    log(`✓ Screenshot already in README`, 'green');
    return true;
  }

  log(`📝 Adding screenshot to README...`, 'blue');
  
  // Add screenshot after the first h1 heading
  const lines = content.split('\n');
  let added = false;
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    
    // Add screenshot after first h1
    if (!added && lines[i].startsWith('# ')) {
      newLines.push('');
      newLines.push(`![App Screenshot](./${screenshotName})`);
      newLines.push('');
      added = true;
    }
  }
  
  fs.writeFileSync(readmePath, newLines.join('\n'));
  log(`✓ Screenshot added to README`, 'green');
  return true;
}

function commitChanges(screenshotName) {
  if (!options.commit) {
    log('⏭️  Skipping commit (use --commit to auto-commit)', 'yellow');
    return;
  }

  log('📤 Committing changes...', 'blue');
  
  try {
    execSync('git add README.md ' + screenshotName, { stdio: 'ignore' });
    execSync(
      'git commit -m "Add screenshot to README\n\n- Automated screenshot capture of running app\n- Shows main interface and key features"',
      { stdio: 'ignore' }
    );
    execSync('git push', { stdio: 'ignore' });
    log('✓ Changes pushed to GitHub', 'green');
  } catch (error) {
    log(`⚠️  Commit/push failed: ${error.message}`, 'yellow');
  }
}

async function main() {
  log('📸 Screenshot README Generator', 'blue');
  log('================================\n', 'blue');

  const readmePath = path.join(process.cwd(), 'README.md');
  
  // Check prerequisites
  if (!fs.existsSync(readmePath)) {
    log('⚠️  No README.md found, skipping', 'yellow');
    process.exit(0);
  }

  // Handle server
  let serverUrl;
  let serverProcess = null;
  
  if (options.skipServer) {
    serverUrl = `http://localhost:${options.port}`;
    log(`✓ Using existing server at ${serverUrl}`, 'green');
  } else {
    // Find available port
    let port = options.port;
    if (checkPort(port)) {
      log(`⚠️  Port ${port} in use, searching for available port...`, 'yellow');
      port = findAvailablePort(port + 1);
      if (!port) {
        log('❌ No available port found', 'red');
        process.exit(1);
      }
      log(`✓ Found available port: ${port}`, 'green');
    }
    
    // Start dev server
    log(`🚀 Starting dev server on port ${port}...`, 'blue');
    serverProcess = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
      detached: true,
      stdio: 'ignore',
    });
    
    serverUrl = `http://localhost:${port}`;
    
    // Wait for server
    log(`⏳ Waiting for server to start...`, 'blue');
    const ready = await waitForServer(serverUrl, 30000);
    if (!ready) {
      log('❌ Server failed to start', 'red');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    log(`✓ Server ready!`, 'green');
  }

  // Capture screenshot
  const success = await captureScreenshot(serverUrl, options.output);
  if (!success) {
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }

  log(`✓ Screenshot saved: ${options.output}`, 'green');

  // Add to README
  addScreenshotToReadme(readmePath, options.output);

  // Cleanup server
  if (serverProcess) {
    log(`🛑 Stopping dev server...`, 'blue');
    serverProcess.kill();
  }

  // Commit changes
  commitChanges(options.output);

  log('\n✅ Screenshot automation complete!', 'green');
  log(`   - Screenshot: ${options.output}`, 'reset');
  log(`   - Updated: README.md`, 'reset');
}

main().catch(error => {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
