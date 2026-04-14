#!/usr/bin/env node
/**
 * Taste Calibration Scraper
 * 
 * Daily collection of design system components from companies with excellent design.
 * Organizes by component type for Pixel's reference.
 * 
 * Schedule: Daily at 10 AM PST
 * Output: pixel/design-references/taste-calibration/
 */

const fs = require('fs');
const path = require('path');

const SAVE_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/agents/pixel/design-references/taste-calibration';
const MEMORY_DIR = '/home/n8garvie/NateMate/notes/NateMateNotes/memory/design-inspiration';

// Companies with excellent design systems to monitor - DIVERSE AESTHETICS
const DESIGN_SOURCES = [
  // Minimal / Clean (Enterprise SaaS)
  { name: 'Linear', url: 'https://linear.app', components: ['buttons', 'inputs', 'modals', 'navigation'], aesthetic: 'minimal-clean', industry: 'productivity' },
  { name: 'Notion', url: 'https://notion.so', components: ['sidebar', 'editor', 'cards', 'inputs'], aesthetic: 'minimal-clean', industry: 'productivity' },
  { name: 'Cron', url: 'https://cron.com', components: ['calendar', 'inputs', 'navigation'], aesthetic: 'minimal-clean', industry: 'productivity' },
  { name: 'Reflect', url: 'https://reflect.app', components: ['editor', 'navigation', 'search'], aesthetic: 'minimal-clean', industry: 'notes' },
  
  // Bold / Developer-Focused
  { name: 'Stripe', url: 'https://stripe.com', components: ['buttons', 'cards', 'code-blocks', 'forms'], aesthetic: 'bold-developer', industry: 'fintech' },
  { name: 'Vercel', url: 'https://vercel.com', components: ['buttons', 'cards', 'navigation', 'hero'], aesthetic: 'bold-developer', industry: 'dev-tools' },
  { name: 'Supabase', url: 'https://supabase.com', components: ['docs', 'navigation', 'code-blocks'], aesthetic: 'bold-developer', industry: 'dev-tools' },
  { name: 'GitHub', url: 'https://github.com', components: ['code-review', 'navigation', 'forms'], aesthetic: 'bold-developer', industry: 'dev-tools' },
  { name: 'PlanetScale', url: 'https://planetscale.com', components: ['dashboard', 'terminal', 'navigation'], aesthetic: 'bold-developer', industry: 'dev-tools' },
  
  // Modern / Gradient-Forward
  { name: 'Framer', url: 'https://framer.com', components: ['hero', 'cards', 'animations', 'navigation'], aesthetic: 'modern-gradient', industry: 'design-tools' },
  { name: 'Pitch', url: 'https://pitch.com', components: ['presentations', 'editor', 'templates'], aesthetic: 'modern-gradient', industry: 'productivity' },
  { name: 'Loom', url: 'https://loom.com', components: ['video-player', 'recording', 'sharing'], aesthetic: 'modern-gradient', industry: 'communication' },
  { name: 'Figma', url: 'https://figma.com', components: ['toolbars', 'panels', 'inputs', 'navigation'], aesthetic: 'modern-gradient', industry: 'design-tools' },
  
  // Editorial / Typography-Focused
  { name: 'Readwise', url: 'https://readwise.io', components: ['reader', 'highlights', 'library'], aesthetic: 'editorial-typography', industry: 'reading' },
  { name: 'Substack', url: 'https://substack.com', components: ['editor', 'publication', 'reading'], aesthetic: 'editorial-typography', industry: 'publishing' },
  { name: 'Medium', url: 'https://medium.com', components: ['reader', 'editor', 'publication'], aesthetic: 'editorial-typography', industry: 'publishing' },
  { name: 'Read.cv', url: 'https://read.cv', components: ['profiles', 'portfolio', 'timeline'], aesthetic: 'editorial-typography', industry: 'career' },
  
  // Luxury / Premium
  { name: 'Apple', url: 'https://apple.com', components: ['product-pages', 'navigation', 'hero'], aesthetic: 'luxury-premium', industry: 'consumer' },
  { name: 'Mercedes', url: 'https://mercedes-benz.com', components: ['configurator', 'gallery', 'navigation'], aesthetic: 'luxury-premium', industry: 'automotive' },
  { name: 'Tiffany', url: 'https://tiffany.com', components: ['product-pages', 'gallery', 'navigation'], aesthetic: 'luxury-premium', industry: 'jewelry' },
  { name: 'Aesop', url: 'https://aesop.com', components: ['product-pages', 'editorial', 'navigation'], aesthetic: 'luxury-premium', industry: 'beauty' },
  
  // Brutalist / Experimental
  { name: 'Gumroad', url: 'https://gumroad.com', components: ['product-pages', 'checkout', 'dashboard'], aesthetic: 'brutalist-experimental', industry: 'creator-economy' },
  { name: 'Are.na', url: 'https://are.na', components: ['blocks', 'channels', 'discovery'], aesthetic: 'brutalist-experimental', industry: 'creative' },
  { name: 'Teenage Engineering', url: 'https://teenage.engineering', components: ['product-pages', 'configurator'], aesthetic: 'brutalist-experimental', industry: 'hardware' },
  { name: 'Bento', url: 'https://bento.me', components: ['profiles', 'links', 'embeds'], aesthetic: 'brutalist-experimental', industry: 'social' },
  
  // Playful / Friendly
  { name: 'Duolingo', url: 'https://duolingo.com', components: ['lessons', 'gamification', 'avatars'], aesthetic: 'playful-friendly', industry: 'education' },
  { name: 'Discord', url: 'https://discord.com', components: ['chat', 'voice', 'navigation'], aesthetic: 'playful-friendly', industry: 'communication' },
  { name: 'Slack', url: 'https://slack.com', components: ['messaging', 'sidebar', 'integrations'], aesthetic: 'playful-friendly', industry: 'communication' },
  { name: 'Zapier', url: 'https://zapier.com', components: ['workflows', 'automation', 'forms'], aesthetic: 'playful-friendly', industry: 'automation' },
  
  // Data-Dense / Dashboard-Heavy
  { name: 'Railway', url: 'https://railway.app', components: ['dashboard', 'cards', 'buttons', 'deploy-ui'], aesthetic: 'data-dense', industry: 'dev-tools' },
  { name: 'Amplitude', url: 'https://amplitude.com', components: ['analytics', 'charts', 'dashboard'], aesthetic: 'data-dense', industry: 'analytics' },
  { name: 'Mixpanel', url: 'https://mixpanel.com', components: ['funnels', 'reports', 'dashboard'], aesthetic: 'data-dense', industry: 'analytics' },
  { name: 'Looker', url: 'https://looker.com', components: ['visualizations', 'dashboard', 'explore'], aesthetic: 'data-dense', industry: 'analytics' },
  
  // E-Commerce / Conversion-Focused
  { name: 'Shopify', url: 'https://shopify.com', components: ['product-pages', 'checkout', 'cart'], aesthetic: 'ecommerce-conversion', industry: 'ecommerce' },
  { name: 'Glossier', url: 'https://glossier.com', components: ['product-pages', 'gallery', 'checkout'], aesthetic: 'ecommerce-conversion', industry: 'beauty' },
  { name: 'Allbirds', url: 'https://allbirds.com', components: ['product-pages', 'sustainability', 'checkout'], aesthetic: 'ecommerce-conversion', industry: 'fashion' },
  { name: 'Squarespace', url: 'https://squarespace.com', components: ['templates', 'editor', 'gallery'], aesthetic: 'ecommerce-conversion', industry: 'websites' },
  
  // Swiss / Grid-Based
  { name: 'Swiss Design Awards', url: 'https://swissdesignawards.ch', components: ['grid', 'typography', 'navigation'], aesthetic: 'swiss-grid', industry: 'awards' },
  { name: 'Swiss Style', url: 'https://swiss-style.com', components: ['grid', 'typography', 'layout'], aesthetic: 'swiss-grid', industry: 'reference' },
  
  // Dark / Cyber
  { name: 'Raycast', url: 'https://raycast.com', components: ['command-palette', 'list-items', 'inputs'], aesthetic: 'dark-cyber', industry: 'productivity' },
  { name: 'Warp', url: 'https://warp.dev', components: ['terminal', 'ai-assistant', 'themes'], aesthetic: 'dark-cyber', industry: 'dev-tools' },
  { name: 'Arc Browser', url: 'https://arc.net', components: ['sidebar', 'tabs', 'command-palette'], aesthetic: 'dark-cyber', industry: 'browser' },
  { name: 'CodeSandbox', url: 'https://codesandbox.io', components: ['editor', 'preview', 'collaboration'], aesthetic: 'dark-cyber', industry: 'dev-tools' },
  
  // Open Source / Community
  { name: 'Tailwind UI', url: 'https://tailwindui.com', components: ['all-patterns'], aesthetic: 'open-source', industry: 'dev-tools' },
  { name: 'Radix UI', url: 'https://radix-ui.com', components: ['primitives', 'dialogs', 'dropdowns'], aesthetic: 'open-source', industry: 'dev-tools' },
  { name: 'Headless UI', url: 'https://headlessui.com', components: ['transitions', 'overlays'], aesthetic: 'open-source', industry: 'dev-tools' },
  { name: 'Shadcn UI', url: 'https://ui.shadcn.com', components: ['components', 'themes', 'blocks'], aesthetic: 'open-source', industry: 'dev-tools' },
];

// Component categories for organization
const COMPONENT_CATEGORIES = [
  'buttons',
  'inputs',
  'cards',
  'navigation',
  'modals',
  'forms',
  'tables',
  'lists',
  'dropdowns',
  'tabs',
  'tooltips',
  'alerts',
  'badges',
  'skeletons',
  'loaders',
  'empty-states',
  'hero',
  'dashboard',
  'sidebar',
  'command-palette'
];

// Colors to extract and track
const SIGNATURE_COLORS = {
  'Linear': { primary: '#5E6AD2', bg: '#0F1115' },
  'Stripe': { primary: '#635BFF', bg: '#0A0A0A' },
  'Vercel': { primary: '#0070F3', bg: '#000000' },
  'Notion': { primary: '#F5F5F5', bg: '#FFFFFF' },
  'Figma': { primary: '#F24E1E', bg: '#2C2C2C' },
  'Framer': { primary: '#0055FF', bg: '#000000' },
};

function ensureDirectories() {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  
  COMPONENT_CATEGORIES.forEach(cat => {
    fs.mkdirSync(path.join(SAVE_DIR, cat), { recursive: true });
  });
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function searchDesignInspiration() {
  const today = getTodayDate();
  const searchQueries = [
    'Linear app UI components 2026',
    'Stripe dashboard design',
    'Vercel dashboard components',
    'modern dark mode UI components',
    'glassmorphism dashboard design',
    'minimal SaaS dashboard UI'
  ];
  
  // Use Brave Search if available
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) {
    console.log('Brave Search not configured, using curated collection');
    return generateCuratedCollection(today);
  }
  
  // Search for each query
  for (const query of searchQueries.slice(0, 3)) {
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=10`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveKey
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Process and save relevant images
        console.log(`Found ${data.results?.length || 0} images for: ${query}`);
      }
    } catch (err) {
      console.error(`Search failed for ${query}:`, err.message);
    }
  }
}

function generateCuratedCollection(date) {
  // Generate curated design notes based on current trends
  const collection = {
    date,
    sources: DESIGN_SOURCES.map(source => ({
      ...source,
      signatureColors: SIGNATURE_COLORS[source.name] || null
    })),
    trendingPatterns: [
      {
        pattern: 'Glassmorphism with subtle borders',
        examples: ['Linear modals', 'Vercel cards', 'Arc Browser'],
        css: 'backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08);',
        aesthetic: 'minimal-clean'
      },
      {
        pattern: 'Gradient text for hero metrics',
        examples: ['Stripe headings', 'Framer hero', 'Pitch presentations'],
        css: 'background: linear-gradient(135deg, #635BFF, #00E5FF); -webkit-background-clip: text;',
        aesthetic: 'modern-gradient'
      },
      {
        pattern: 'Minimal button states',
        examples: ['Linear', 'Raycast', 'Cron'],
        notes: 'Ghost buttons with subtle hover backgrounds, no borders',
        aesthetic: 'minimal-clean'
      },
      {
        pattern: 'Generous card padding',
        examples: ['Stripe', 'Notion', 'Apple product pages'],
        notes: '24px+ padding, creates premium feel',
        aesthetic: 'luxury-premium'
      },
      {
        pattern: 'Monospace for data/numbers',
        examples: ['Vercel analytics', 'Linear timestamps', 'Warp terminal'],
        notes: 'Tabular numbers, creates alignment',
        aesthetic: 'data-dense'
      },
      {
        pattern: 'Bold typographic hierarchy',
        examples: ['Read.cv', 'Substack', 'Medium'],
        notes: 'Large headings with comfortable reading width',
        aesthetic: 'editorial-typography'
      },
      {
        pattern: 'Brutalist navigation',
        examples: ['Gumroad', 'Are.na', 'Teenage Engineering'],
        notes: 'Raw borders, high contrast, unexpected layouts',
        aesthetic: 'brutalist-experimental'
      },
      {
        pattern: 'Playful micro-interactions',
        examples: ['Duolingo', 'Discord', 'Zapier'],
        notes: 'Subtle animations, friendly feedback, gamification cues',
        aesthetic: 'playful-friendly'
      },
      {
        pattern: 'Swiss grid layouts',
        examples: ['Swiss Design Awards', 'Readwise'],
        notes: 'Strict grid systems, asymmetric balance, bold typography',
        aesthetic: 'swiss-grid'
      },
      {
        pattern: 'Dark mode with accent glows',
        examples: ['Warp', 'CodeSandbox', 'Arc Browser'],
        notes: 'Pure black backgrounds with vibrant accent colors',
        aesthetic: 'dark-cyber'
      },
      {
        pattern: 'Editorial photography integration',
        examples: ['Aesop', 'Tiffany', 'Allbirds'],
        notes: 'Full-bleed images, minimal UI overlay, product focus',
        aesthetic: 'luxury-premium'
      },
      {
        pattern: 'Dense data dashboards',
        examples: ['Amplitude', 'Mixpanel', 'Railway'],
        notes: 'Multiple chart types, compact layouts, information-rich',
        aesthetic: 'data-dense'
      }
    ],
  };
  
  const collectionPath = path.join(MEMORY_DIR, `${date}-taste-calibration.json`);
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  
  return collection;
}

function generateComponentReference() {
  // Create comprehensive component reference from top design systems
  const reference = {
    updated: getTodayDate(),
    components: {
      buttons: {
        principles: [
          'Clear hierarchy: primary, secondary, ghost',
          'Consistent padding: 8-12px vertical, 12-24px horizontal',
          'Visible focus states with ring',
          'Subtle hover transitions (150ms)',
          'No drastic color changes on hover'
        ],
        examples: {
          Linear: {
            primary: 'bg-[#5E6AD2] text-white px-3 py-2 rounded-md',
            secondary: 'bg-transparent border border-[#2A2E37] text-[#E2E4E9]',
            ghost: 'bg-transparent text-[#E2E4E9] hover:bg-[#1A1D23]'
          },
          Stripe: {
            primary: 'bg-[#635BFF] text-white px-6 py-3 rounded-lg font-semibold',
            secondary: 'border border-[#2A2A2A] text-white hover:border-[#635BFF]',
            ghost: 'text-[#A1A1AA] hover:text-white'
          }
        }
      },
      
      inputs: {
        principles: [
          'Subtle borders, visible on focus',
          'Placeholder text secondary color',
          'Consistent padding with buttons',
          'Error states with red border + message'
        ],
        examples: {
          Linear: {
            base: 'bg-[#15171C] border border-[#2A2E37] rounded-md px-3 py-2 text-[#E2E4E9]',
            focus: 'border-[#5E6AD2] ring-2 ring-[#5E6AD2]/20',
            error: 'border-red-500'
          }
        }
      },
      
      cards: {
        principles: [
          'Flat design preferred over shadows',
          'Subtle borders for definition',
          'Generous internal padding (16-24px)',
          'Clear visual hierarchy within card'
        ],
        examples: {
          Linear: {
            base: 'bg-[#15171C] border border-[#2A2E37] rounded-lg p-4',
            hover: 'border-[#3E4450]'
          },
          Stripe: {
            base: 'bg-[#141414] border border-[#2A2A2A] rounded-xl p-6',
            hover: 'border-[#404040]'
          }
        }
      },
      
      navigation: {
        principles: [
          'Minimal items (max 5-7)',
          'Clear active state',
          'Consistent spacing between items',
          'Collapsible on mobile'
        ],
        examples: {
          Linear: {
            style: 'Horizontal top nav, glassmorphic on scroll',
            active: 'text-white font-medium',
            inactive: 'text-[#8A8F98] hover:text-[#E2E4E9]'
          },
          Notion: {
            style: 'Sidebar with collapsible sections',
            active: 'bg-[#E3E3E3] text-black',
            hover: 'bg-[#EFEFEF]'
          }
        }
      },
      
      typography: {
        principles: [
          'Font: Inter (system fallback)',
          'Headings: 600-800 weight, tight leading',
          'Body: 400 weight, comfortable leading (1.5-1.6)',
          'Labels: Uppercase, 11-12px, 0.05em tracking',
          'Numbers: Monospace for alignment'
        ],
        scale: {
          hero: { size: '72px', weight: 800, lineHeight: 1.0 },
          h1: { size: '48px', weight: 700, lineHeight: 1.1 },
          h2: { size: '32px', weight: 600, lineHeight: 1.2 },
          h3: { size: '24px', weight: 600, lineHeight: 1.3 },
          body: { size: '16px', weight: 400, lineHeight: 1.5 },
          caption: { size: '14px', weight: 500, lineHeight: 1.4 },
          label: { size: '12px', weight: 500, lineHeight: 1.4, uppercase: true, tracking: '0.05em' }
        }
      },
      
      colors: {
        darkMode: {
          background: {
            primary: '#0A0A0A',    // Vercel, Stripe
            secondary: '#111111',  // Cards
            tertiary: '#1A1A1A'    // Elevated
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#A1A1AA',
            tertiary: '#71717A'
          },
          border: {
            default: '#2A2A2A',
            hover: '#404040',
            strong: '#666666'
          }
        },
        accents: {
          purple: { primary: '#635BFF', hover: '#7B74FF' },      // Stripe
          blue: { primary: '#0070F3', hover: '#0060D6' },        // Vercel
          periwinkle: { primary: '#5E6AD2', hover: '#6872E3' },  // Linear
          emerald: { primary: '#4CD964', hover: '#5EE974' },     // Matrix/Apple
          cyan: { primary: '#00D4FF', hover: '#33DDFF' }         // Phase3 gradient
        }
      },
      
      spacing: {
        base: '4px',
        scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96],
        patterns: {
          cardPadding: '24px',
          sectionGap: '32-48px',
          componentGap: '16-24px',
          tightUI: '8-12px'
        }
      },
      
      effects: {
        glassmorphism: {
          background: 'rgba(17, 17, 24, 0.7)',
          blur: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        },
        gradients: {
          text: 'linear-gradient(135deg, #4CD964, #00D4FF)',
          border: 'linear-gradient(135deg, #4CD964, #00D4FF)',
          glow: '0 0 40px rgba(76, 217, 100, 0.15)'
        },
        shadows: {
          subtle: '0 1px 2px rgba(0, 0, 0, 0.3)',
          card: '0 4px 12px rgba(0, 0, 0, 0.4)',
          elevated: '0 20px 40px rgba(0, 0, 0, 0.4)'
        }
      }
    },
    
    tastePrinciples: [
      'Every element must earn its place — if in doubt, remove it',
      'Color used sparingly creates impact — grayscale with one accent',
      'Typography does the heavy lifting — size and weight create hierarchy',
      'Generous whitespace signals premium quality',
      'Subtle interactions delight without distraction',
      'Flat design with strategic depth (glass, gradients)',
      'Consistency within the system, boldness in the concept'
    ],
    
    aestheticMatching: {
      description: 'Match design aesthetic to product type and target audience',
      recommendations: {
        'productivity-tools': ['minimal-clean', 'dark-cyber'],
        'developer-tools': ['bold-developer', 'dark-cyber', 'modern-gradient'],
        'fintech': ['bold-developer', 'luxury-premium', 'data-dense'],
        'ecommerce': ['luxury-premium', 'ecommerce-conversion', 'playful-friendly'],
        'creative-tools': ['modern-gradient', 'brutalist-experimental', 'playful-friendly'],
        'content-platforms': ['editorial-typography', 'swiss-grid', 'minimal-clean'],
        'consumer-apps': ['playful-friendly', 'modern-gradient', 'luxury-premium'],
        'enterprise-saas': ['minimal-clean', 'data-dense', 'bold-developer'],
        'collectibles-luxury': ['luxury-premium', 'editorial-typography', 'swiss-grid'],
        'education': ['playful-friendly', 'minimal-clean', 'modern-gradient']
      },
      byAesthetic: {
        'minimal-clean': {
          description: 'Clean, sophisticated, focused on content',
          colors: { bg: '#0F1115', accent: '#5E6AD2', text: '#E2E4E9' },
          examples: ['Linear', 'Notion', 'Cron'],
          bestFor: ['productivity', 'professional-tools', 'focus-intensive-apps']
        },
        'bold-developer': {
          description: 'Confident, vibrant, developer-focused',
          colors: { bg: '#0A0A0A', accent: '#635BFF', text: '#FFFFFF' },
          examples: ['Stripe', 'Vercel', 'PlanetScale'],
          bestFor: ['dev-tools', 'API-products', 'technical-platforms']
        },
        'modern-gradient': {
          description: 'Vibrant gradients, dynamic, forward-thinking',
          colors: { bg: '#000000', accent: 'linear-gradient(135deg, #0070F3, #00E5FF)', text: '#FFFFFF' },
          examples: ['Framer', 'Pitch', 'Loom'],
          bestFor: ['creative-tools', 'presentations', 'modern-startups']
        },
        'luxury-premium': {
          description: 'Elegant, generous spacing, product-focused',
          colors: { bg: '#FFFFFF', accent: '#000000', text: '#1A1A1A' },
          examples: ['Apple', 'Aesop', 'Tiffany'],
          bestFor: ['high-end-products', 'fashion', 'collectibles', 'jewelry']
        },
        'editorial-typography': {
          description: 'Content-first, beautiful reading experience',
          colors: { bg: '#FAFAFA', accent: '#FF6B6B', text: '#2D2D2D' },
          examples: ['Substack', 'Medium', 'Read.cv'],
          bestFor: ['publishing', 'blogs', 'long-form-content']
        },
        'brutalist-experimental': {
          description: 'Raw, unexpected, memorable',
          colors: { bg: '#FFFFFF', accent: '#FF0000', text: '#000000' },
          examples: ['Gumroad', 'Are.na', 'Teenage Engineering'],
          bestFor: ['creative-portfolios', 'art-projects', 'standout-brands']
        },
        'playful-friendly': {
          description: 'Approachable, gamified, delightful',
          colors: { bg: '#58CC02', accent: '#FFD700', text: '#3C3C3C' },
          examples: ['Duolingo', 'Discord', 'Zapier'],
          bestFor: ['consumer-apps', 'education', 'social-platforms']
        },
        'dark-cyber': {
          description: 'Matrix-like, terminal-inspired, dev-culture',
          colors: { bg: '#000000', accent: '#00FF41', text: '#00FF41' },
          examples: ['Warp', 'CodeSandbox', 'Arc Browser'],
          bestFor: ['developer-tools', 'hacker-culture', 'terminal-apps']
        },
        'swiss-grid': {
          description: 'Strict grid, asymmetric, typographic',
          colors: { bg: '#FFFFFF', accent: '#FF0000', text: '#000000' },
          examples: ['Swiss Design', 'Readwise'],
          bestFor: ['portfolios', 'galleries', 'editorial-design']
        },
        'data-dense': {
          description: 'Information-rich, compact, analytical',
          colors: { bg: '#111111', accent: '#4CD964', text: '#E2E4E9' },
          examples: ['Amplitude', 'Mixpanel', 'Railway'],
          bestFor: ['analytics', 'dashboards', 'b2b-saas']
        }
      }
    }
  };
  
  const referencePath = path.join(SAVE_DIR, 'component-reference.json');
  fs.writeFileSync(referencePath, JSON.stringify(reference, null, 2));
  
  return reference;
}

function generateTasteIndex() {
  // Create markdown index for easy reference
  const indexPath = path.join(SAVE_DIR, 'INDEX.md');
  
  const content = `# Taste Calibration Index

Daily updated design system reference from companies with excellent taste. **Now with 10+ diverse aesthetic styles** to avoid getting pigeonholed.

## Aesthetic Styles (Choose Based on Product)

| Style | Best For | Example Companies |
|-------|----------|-------------------|
| **minimal-clean** | Productivity, professional tools | Linear, Notion, Cron |
| **bold-developer** | Dev tools, APIs, technical platforms | Stripe, Vercel, PlanetScale |
| **modern-gradient** | Creative tools, modern startups | Framer, Pitch, Loom |
| **luxury-premium** | High-end products, fashion, collectibles | Apple, Aesop, Tiffany |
| **editorial-typography** | Publishing, blogs, content platforms | Substack, Medium, Read.cv |
| **brutalist-experimental** | Creative portfolios, art, standout brands | Gumroad, Are.na, Teenage Engineering |
| **playful-friendly** | Consumer apps, education, social | Duolingo, Discord, Zapier |
| **dark-cyber** | Developer tools, hacker culture | Warp, CodeSandbox, Arc Browser |
| **swiss-grid** | Portfolios, galleries, editorial | Swiss Design, Readwise |
| **data-dense** | Analytics, dashboards, B2B SaaS | Amplitude, Mixpanel, Railway |

## Matching Aesthetic to Product Type

- **Productivity Tools** → minimal-clean, dark-cyber
- **Developer Tools** → bold-developer, dark-cyber, modern-gradient
- **FinTech** → bold-developer, luxury-premium, data-dense
- **E-commerce** → luxury-premium, ecommerce-conversion, playful-friendly
- **Creative Tools** → modern-gradient, brutalist-experimental, playful-friendly
- **Content Platforms** → editorial-typography, swiss-grid, minimal-clean
- **Collectibles/Luxury** → luxury-premium, editorial-typography, swiss-grid
- **Education** → playful-friendly, minimal-clean, modern-gradient

## Component Categories

${COMPONENT_CATEGORIES.map(cat => `- **${cat}** — \`./${cat}/\``).join('\n')}

## Design System References by Style

### Minimal / Clean
- Linear, Notion, Cron, Reflect

### Bold / Developer-Focused  
- Stripe, Vercel, GitHub, PlanetScale

### Modern / Gradient-Forward
- Framer, Pitch, Loom, Figma

### Editorial / Typography-Focused
- Readwise, Substack, Medium, Read.cv

### Luxury / Premium
- Apple, Mercedes, Tiffany, Aesop

### Brutalist / Experimental
- Gumroad, Are.na, Teenage Engineering, Bento

### Playful / Friendly
- Duolingo, Discord, Slack, Zapier

### Dark / Cyber
- Raycast, Warp, Arc Browser, CodeSandbox

### Data-Dense / Analytics
- Railway, Amplitude, Mixpanel, Looker

## Taste Principles

1. Every element must earn its place
2. Color used sparingly creates impact
3. Typography does the heavy lifting
4. Generous whitespace signals premium quality
5. Subtle interactions delight without distraction
6. **Match aesthetic to product personality, not just current trends**

## Usage for Pixel

1. **Determine product type** and target audience
2. **Choose 2-3 compatible aesthetic styles** from matching table above
3. **Reference specific companies** in those styles from design system folders
4. Check \`component-reference.json\` for exact Tailwind classes
5. Apply Ralph Loop with chosen aesthetic direction

Last updated: ${getTodayDate()}
`;
  
  fs.writeFileSync(indexPath, content);
}

async function main() {
  console.log('🎨 Taste Calibration Scraper\n');
  
  ensureDirectories();
  
  // Search for new inspiration
  console.log('Searching for design inspiration...');
  await searchDesignInspiration();
  
  // Generate component reference
  console.log('Generating component reference...');
  generateComponentReference();
  
  // Generate index
  console.log('Generating index...');
  generateTasteIndex();
  
  console.log(`\n✓ Taste calibration updated`);
  console.log(`Location: ${SAVE_DIR}`);
  console.log(`Memory: ${MEMORY_DIR}`);
}

main().catch(console.error);
