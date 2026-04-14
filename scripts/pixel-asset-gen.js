#!/usr/bin/env node
/**
 * Pixel Asset Generator
 * 
 * Generates images/icons using Banana.dev API
 * Called by Pixel during design phase
 * 
 * Usage: node pixel-asset-gen.js <prompt> <output-path>
 */

const fs = require('fs');
const path = require('path');

const BANANA_API_KEY = process.env.BANANA_API_KEY;
const BANANA_MODEL = process.env.BANANA_MODEL || 'flux-schnell'; // or 'sdxl', 'kandinsky'

async function generateImage(prompt, outputPath) {
  if (!BANANA_API_KEY) {
    console.error('BANANA_API_KEY not set');
    return { success: false, error: 'API key missing' };
  }

  console.log(`Generating: ${prompt.substring(0, 60)}...`);

  try {
    const response = await fetch('https://api.banana.dev/start/v4/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BANANA_API_KEY}`
      },
      body: JSON.stringify({
        model: BANANA_MODEL,
        prompt: prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 4, // Fast generation
        guidance_scale: 7.5
      })
    });

    if (!response.ok) {
      throw new Error(`Banana API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Download the image
    if (result.image_url) {
      const imageResponse = await fetch(result.image_url);
      const buffer = await imageResponse.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`✓ Saved: ${outputPath}`);
      return { success: true, path: outputPath };
    } else if (result.base64) {
      fs.writeFileSync(outputPath, Buffer.from(result.base64, 'base64'));
      console.log(`✓ Saved: ${outputPath}`);
      return { success: true, path: outputPath };
    }

    return { success: false, error: 'No image in response' };
  } catch (err) {
    console.error('Generation failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Generate app icons
async function generateAppIcon(appName, style, outputDir) {
  const prompt = `App icon for "${appName}", ${style}, minimalist, premium, dark background, single accent color, vector style, high quality, professional`;
  const outputPath = path.join(outputDir, 'app-icon.png');
  return generateImage(prompt, outputPath);
}

// Generate hero illustration
async function generateHeroImage(concept, style, outputDir) {
  const prompt = `${concept}, ${style}, premium aesthetic, dark moody lighting, luxury brand style, high quality, professional photography`;
  const outputPath = path.join(outputDir, 'hero-image.png');
  return generateImage(prompt, outputPath);
}

// Generate placeholder/wireframe images
async function generatePlaceholder(type, outputDir) {
  const prompts = {
    'watch': 'Luxury watch on dark background, product photography, dramatic lighting, Rolex style, premium',
    'dashboard': 'Dashboard UI mockup, dark mode, analytics charts, premium SaaS design, purple and blue accents',
    'user': 'Professional headshot silhouette, dark background, premium corporate style',
    'upload': 'Upload icon visual, drag and drop, file transfer, dark theme, blue accent'
  };
  
  const prompt = prompts[type] || 'Abstract geometric pattern, dark mode, premium tech aesthetic';
  const outputPath = path.join(outputDir, `${type}-placeholder.png`);
  return generateImage(prompt, outputPath);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log('Usage:');
    console.log('  node pixel-asset-gen.js icon "App Name" <style> <output-dir>');
    console.log('  node pixel-asset-gen.js hero "concept" <style> <output-dir>');
    console.log('  node pixel-asset-gen.js placeholder <type> <output-dir>');
    console.log('  node pixel-asset-gen.js custom "prompt" <output-path>');
    process.exit(1);
  }

  switch (command) {
    case 'icon':
      const [appName, style, iconOutputDir] = args;
      await generateAppIcon(appName, style, iconOutputDir);
      break;
    
    case 'hero':
      const [concept, heroStyle, heroOutputDir] = args;
      await generateHeroImage(concept, heroStyle, heroOutputDir);
      break;
    
    case 'placeholder':
      const [type, placeholderOutputDir] = args;
      await generatePlaceholder(type, placeholderOutputDir);
      break;
    
    case 'custom':
      const [customPrompt, customOutputPath] = args;
      await generateImage(customPrompt, customOutputPath);
      break;
    
    default:
      console.log('Unknown command:', command);
  }
}

main().catch(console.error);
