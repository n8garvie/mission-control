# Vercel Design System Reference

## Philosophy
Modern, dark, gradient-forward. Developer tools that feel futuristic.

## Color Palette

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#000000` | Pure black |
| bg-secondary | `#111111` | Cards |
| bg-tertiary | `#1A1A1A` | Elevated |
| border | `#333333` | Borders |
| border-hover | `#444444` | Hover |

### Accent (Blue/Cyan)
| Token | Hex | Usage |
|-------|-----|-------|
| accent | `#0070F3` | Vercel blue |
| accent-hover | `#0060D6` | Darker blue |
| cyan | `#00E5FF` | Secondary accent |
| gradient-start | `#0070F3` | |
| gradient-end | `#00E5FF` | |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#FFFFFF` | White |
| text-secondary | `#888888` | Gray |
| text-tertiary | `#666666` | Muted |

## Typography

### Font
- **Family:** `Inter`
- **Weights:** 400, 500, 600, 700, 800
- **Style:** Clean, modern, tech-forward

### Scale
| Level | Size | Weight |
|-------|------|--------|
| Hero | 80px | 800 |
| H1 | 48px | 700 |
| H2 | 32px | 600 |
| H3 | 24px | 600 |
| Body | 16px | 400 |
| Caption | 14px | 500 |

## Spacing
| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-6 | 24px |
| space-8 | 32px |
| space-12 | 48px |
| space-16 | 64px |

## Border Radius
| Token | Value |
|-------|-------|
| radius-sm | 4px |
| radius-md | 8px |
| radius-lg | 12px |
| radius-full | 9999px |

## Effects

### Gradients
```css
/* Primary gradient */
background: linear-gradient(90deg, #0070F3, #00E5FF);

/* Glow effect */
box-shadow: 0 0 40px rgba(0, 112, 243, 0.3);
```

### Shadows
```css
box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
```

## Components

### Buttons
**Primary**
- Background: #0070F3
- Text: white
- Radius: 6px
- Hover: #0060D6

**Secondary**
- Border: 1px solid #333
- Hover: border #888

### Cards
- Background: #111
- Border: 1px solid #333
- Radius: 8px

## What Makes It Work
- Pure black backgrounds
- Blue-to-cyan gradients
- Clean Inter typography
- Tech/developer aesthetic
- Subtle but present borders
