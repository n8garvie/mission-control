#!/usr/bin/env node
/**
 * Test generation pipeline
 * Runs a minimal test to verify all APIs are working
 */

const Anthropic = require('@anthropic-ai/sdk');
const Replicate = require('replicate');

// Check environment
const requiredEnv = [
  'ANTHROPIC_API_KEY',
  'REPLICATE_API_TOKEN',
  'IDEOGRAM_API_KEY',
  'ARENA_TOKEN'
];

const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   ${key}`));
  console.error('\nRun: bash scripts/setup-api-keys.sh');
  process.exit(1);
}

const anthropic = new Anthropic();
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function testClaude() {
  console.log('🧪 Testing Claude Sonnet 4.5...');
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Write a one-sentence greeting.' }]
    });
    console.log('✓ Claude working:', response.content[0].text.substring(0, 50));
    return true;
  } catch (err) {
    console.error('✗ Claude failed:', err.message);
    return false;
  }
}

async function testReplicate() {
  console.log('\n🧪 Testing Replicate (Flux)...');
  try {
    // Just list models to verify auth
    const models = await replicate.models.list({ limit: 1 });
    console.log('✓ Replicate working');
    return true;
  } catch (err) {
    console.error('✗ Replicate failed:', err.message);
    return false;
  }
}

async function testIdeogram() {
  console.log('\n🧪 Testing Ideogram...');
  try {
    const response = await fetch('https://api.ideogram.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Api-Key': process.env.IDEOGRAM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Minimalist logo with text "Test"',
        model: 'V_3',
        aspect_ratio: 'ASPECT_1_1',
        magic_prompt_option: 'OFF' // Faster, cheaper test
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('✓ Ideogram working');
    return true;
  } catch (err) {
    console.error('✗ Ideogram failed:', err.message);
    return false;
  }
}

async function testArena() {
  console.log('\n🧪 Testing Are.na...');
  try {
    const response = await fetch('https://api.are.na/v2/channels', {
      headers: { 'Authorization': `Bearer ${process.env.ARENA_TOKEN}` }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('✓ Are.na working');
    return true;
  } catch (err) {
    console.error('✗ Are.na failed:', err.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     AI Design Workflow - API Test                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const results = await Promise.all([
    testClaude(),
    testReplicate(),
    testIdeogram(),
    testArena()
  ]);
  
  const allPassed = results.every(r => r);
  
  console.log('\n─────────────────────────────────────────────────────────');
  
  if (allPassed) {
    console.log('✓ All APIs working! Ready to generate.');
    console.log('\nNext step:');
    console.log('  node scripts/muse-create-mood-board.js "Your app idea"');
  } else {
    console.log('✗ Some APIs failed. Check errors above.');
    console.log('\nTo reconfigure:');
    console.log('  bash scripts/setup-api-keys.sh');
    process.exit(1);
  }
}

main().catch(console.error);
