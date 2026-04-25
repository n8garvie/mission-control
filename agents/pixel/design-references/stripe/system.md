# Stripe Design System Reference

## Philosophy
Bold, confident, developer-focused. Clean with moments of visual impact.

## Color Palette

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#0A0A0A` | Deep black background |
| bg-secondary | `#141414` | Cards, panels |
| bg-elevated | `#1A1A1A` | Modals, popovers |
| border | `#2A2A2A` | Borders |
| border-strong | `#404040` | Active borders |

### Accent (Vibrant Purple)
| Token | Hex | Usage |
|-------|-----|-------|
| accent | `#635BFF` | Primary purple |
| accent-hover | `#7B74FF` | Lighter purple |
| accent-dark | `#4F46E5` | Darker shade |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#FFFFFF` | White headings |
| text-secondary | `#A1A1AA` | Gray body |
| text-tertiary | `#71717A` | Muted text |

## Typography

### Font
- **Family:** `Inter` (custom weights)
- **Weights:** 400, 500, 600, 700
- **Style:** Modern, confident

### Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Hero | 72px | 700 | Landing headlines |
| H1 | 48px | 700 | Page titles |
| H2 | 32px | 600 | Section headers |
| H3 | 24px | 600 | Card titles |
| Body | 16px | 400 | Paragraphs |
| Caption | 14px | 500 | Labels |

### Patterns
- Bold headlines (700 weight)
- Generous line height for readability
- Strategic use of purple accent in headings

## Spacing

### Scale
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

### Patterns
- Section padding: 64-96px
- Card padding: 24px
- Component gaps: 16-24px

## Border Radius
| Token | Value |
|-------|-------|
| radius-sm | 6px |
| radius-md | 8px |
| radius-lg | 12px |
| radius-xl | 16px |
| radius-full | 9999px |

## Effects

### Gradients
```css
/* Hero gradient */
background: linear-gradient(135deg, #635BFF 0%, #9D8CFF 50%, #FF6B9D 100%);

/* Subtle glow */
box-shadow: 0 0 80px rgba(99, 91, 255, 0.3);
```

### Shadows
```css
/* Card hover */
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

/* Elevated */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
```

## Components

### Buttons
**Primary (Purple)**
- Background: #635BFF
- Text: white
- Padding: 12px 24px
- Radius: 8px
- Font: 16px, 600 weight
- Hover: #7B74FF, slight scale(1.02)

**Secondary (Outline)**
- Background: transparent
- Border: 1px solid #2A2A2A
- Hover: border #635BFF, text #635BFF

### Cards
- Background: #141414
- Border: 1px solid #2A2A2A
- Radius: 12px
- Padding: 24px
- Hover: border color lightens

### Code Blocks
- Background: #0A0A0A
- Border: 1px solid #2A2A2A
- Radius: 8px
- Syntax highlighting with purple accents

## Layout Principles

1. **Bold contrasts** — Deep blacks, bright accents
2. **Generous breathing room** — Large section padding
3. **Purple moments** — Strategic accent usage
4. **Developer-focused** — Code examples, terminal styling
5. **Smooth interactions** — Hover scales, transitions

## What Makes It Work
- Confidence in color (bold purple)
- Premium feel through spacing
- Clear developer focus
- Beautiful code presentation
- Strategic use of gradients for impact
