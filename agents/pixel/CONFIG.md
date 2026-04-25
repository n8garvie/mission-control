# Pixel Agent Configuration

## Overview
Pixel is the Design Agent responsible for creating UI/UX designs for Mission Control builds.

### Asset Generation (Nano Banana Pro)
Pixel can now generate visual assets using Google Gemini Nano:
- **App icons** - Premium icons for the product
- **Hero images** - Landing page imagery
- **Placeholder images** - UI mockup content

**Location:** `skills/nano-banana-pro/`
**Models:** gemini-2.0-flash-exp-image-generation
**Output:** `/pixel/assets/` directory

## Capabilities

### Model
- **Primary:** `anthropic/claude-sonnet-4-6`
- **Reasoning:** Superior aesthetic judgment compared to earlier models
- **Design Systems Knowledge:** Linear, Stripe, Apple HIG, Vercel

### Vision (Option A)
- Can analyze Dribbble reference images before designing
- Extracts specific hex values, typography, spacing
- Learns from visual examples rather than text descriptions

### Ralph Loop
Built-in iteration:
1. First pass: Design with inspiration
2. Self-evaluation: "This is terrible, make it simpler"
3. Reduction: Remove 30%, simplify nav, reduce colors, increase whitespace

## Process

### Input
- Product description
- MVP scope
- Target audience
- Dribbble reference images (latest scrape)

### Output
1. `design-system.md` - Colors, typography, spacing, effects
2. `dashboard-mockup.md` - Layouts and wireframes
3. `components.md` - React component specifications
4. `COMPLETION.md` - Design decisions and Ralph Loop notes

## Reference Library

Location: `pixel/design-references/`

### Design System References
Top-tier systems broken down by philosophy:
- `linear/` - Clean, minimal, sophisticated
- `stripe/` - Bold, confident, developer-focused
- `apple/` - Polished, accessible, platform-native
- `vercel/` - Dark mode, gradients, modern tech

### Taste Calibration (Option C)
**Location:** `taste-calibration/`

Daily updated component library from companies with excellent design:
- `INDEX.md` - Quick reference and principles
- `component-reference.json` - Exact Tailwind classes for buttons, cards, inputs, etc.
- `buttons/`, `cards/`, `inputs/`, `navigation/` - Component-specific patterns

**Sources tracked:** Linear, Stripe, Vercel, Notion, Figma, Framer, Railway, Supabase, Raycast, Radix UI, Headless UI

**Taste Principles:**
1. Every element must earn its place
2. Color used sparingly creates impact
3. Typography does the heavy lifting
4. Generous whitespace signals premium quality
5. Subtle interactions delight without distraction

## Constraints

- Max 3 colors in palette
- Max 3 top-level navigation items
- No em dashes in copy
- Flat design preferred (no shadows unless essential)
- Specific hex values required (no Tailwind defaults)
- Must reference Dribbble images if available

## Recent Improvements

### v2.0 (2026-02-26)
- Switched from Kimi to Claude Sonnet 4.6 (Option B)
- Added vision capability for Dribbble analysis (Option A)
- Enhanced Ralph Loop with specific reduction rules
- Added design reference library

### v1.0 (2026-02-25)
- Basic design agent with Kimi
- Ralph Loop simplification
- Text-based outputs
