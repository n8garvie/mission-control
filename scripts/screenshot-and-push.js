#!/usr/bin/env node
/**
 * screenshot-and-push.js - Mission Control Screenshot Automation
 * 
 * Automatically captures screenshot of built app and pushes to GitHub
 * This is called as the final step of every Mission Control build
 * 
 * Usage:
 *   node screenshot-and-push.js <build-path>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildPath = process.argv[2];

if (!buildPath) {
  console.error('Usage: node screenshot-and-push.js <build-path>');
  process.exit(1);
}

const finalPath = path.join(buildPath, 'integrator', 'final');

if (!fs.existsSync(finalPath)) {
  console.error(`No final build found at ${finalPath}`);
  process.exit(1);
}

console.log('📸 Mission Control: Screenshot & Push');
console.log('=====================================');
console.log(`Build path: ${finalPath}`);

// Check for package.json
const packageJsonPath = path.join(finalPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('No package.json found - not a Node.js project');
  process.exit(0);
}

// Detect project type
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

let port = 3000;
let startCmd = 'npm run dev';

if (deps['next']) {
  console.log('📦 Detected: Next.js');
  port = 3000;
} else if (deps['vite']) {
  console.log('📦 Detected: Vite');
  port = 5173;
} else if (deps['react-scripts']) {
  console.log('📦 Detected: Create React App');
  port = 3000;
  startCmd = 'npm start';
} else {
  console.log('📦 Generic Node.js project');
  port = 3000;
}

// Build first
console.log('🔨 Building project...');
try {
  execSync('npm run build', { 
    cwd: finalPath, 
    stdio: 'ignore',
    timeout: 120000
  });
  console.log('✅ Build successful');
} catch (err) {
  console.log('⚠️  Build failed or not available, continuing with dev server');
}

// Find available port
console.log('🔍 Finding available port...');
for (const tryPort of [port, 3001, 3002, 3003, 5173, 5174, 8080]) {
  try {
    execSync(`lsof -Pi :${tryPort} -sTCP:LISTEN -t`, { stdio: 'ignore' });
  } catch {
    port = tryPort;
    console.log(`✅ Using port: ${port}`);
    break;
  }
}

// Start dev server
console.log('🚀 Starting dev server...');
const serverProcess = require('child_process').spawn(
  'npm', ['run', 'dev', '--', '--port', port.toString()],
  { 
    cwd: finalPath,
    detached: true,
    stdio: 'ignore'
  }
);

// Wait for server
console.log('⏳ Waiting for server to start...');
let serverReady = false;
for (let i = 0; i < 60; i++) {
  try {
    execSync(`curl -s http://localhost:${port} > /dev/null`, { stdio: 'ignore' });
    serverReady = true;
    console.log('✅ Server ready!');
    break;
  } catch {
    require('child_process').execSync('sleep 1');
  }
}

if (!serverReady) {
  console.error('❌ Server failed to start');
  process.kill(-serverProcess.pid);
  process.exit(1);
}

// Capture screenshot
console.log('📷 Capturing screenshot...');
try {
  execSync(
    `npx playwright screenshot --full-page --wait-for-timeout 5000 --color-scheme=dark http://localhost:${port} screenshot.png`,
    { 
      cwd: finalPath,
      stdio: 'inherit',
      timeout: 60000
    }
  );
  console.log('✅ Screenshot captured: screenshot.png');
} catch (err) {
  console.error('❌ Screenshot capture failed:', err.message);
  process.kill(-serverProcess.pid);
  process.exit(1);
}

// Stop server
console.log('🛑 Stopping dev server...');
process.kill(-serverProcess.pid);

// Add to README
const readmePath = path.join(finalPath, 'README.md');
if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf-8');
  
  if (!readme.includes('screenshot.png')) {
    console.log('📝 Adding screenshot to README...');
    const lines = readme.split('\n');
    const newLines = [];
    let added = false;
    
    for (const line of lines) {
      newLines.push(line);
      if (!added && line.startsWith('# ')) {
        newLines.push('');
        newLines.push('![App Screenshot](./screenshot.png)');
        newLines.push('');
        added = true;
      }
    }
    
    fs.writeFileSync(readmePath, newLines.join('\n'));
    console.log('✅ Screenshot added to README');
  } else {
    console.log('✅ Screenshot already in README');
  }
}

// Git commit and push
const gitDir = path.join(finalPath, '.git');
if (fs.existsSync(gitDir)) {
  console.log('📤 Committing and pushing to GitHub...');
  try {
    execSync('git add README.md screenshot.png', { cwd: finalPath, stdio: 'ignore' });
    execSync('git commit -m "Add screenshot to README [Mission Control Auto]"', { 
      cwd: finalPath, 
      stdio: 'ignore'
    });
    execSync('git push', { cwd: finalPath, stdio: 'ignore' });
    console.log('✅ Pushed to GitHub');
  } catch (err) {
    console.log('⚠️  Git operations skipped (may already be committed)');
  }
}

console.log('');
console.log('✅ Screenshot automation complete!');
console.log(`   📁 ${finalPath}/screenshot.png`);
console.log(`   📄 ${finalPath}/README.md`);
