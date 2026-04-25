# Linear Design System Reference

## Philosophy
"Simplicity is the ultimate sophistication." — Every pixel earns its place.

## Color Palette

### Dark Mode (Primary)
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#0F1115` | Main background |
| bg-secondary | `#15171C` | Cards, panels |
| bg-tertiary | `#1A1D23` | Elevated elements |
| border | `#2A2E37` | Subtle borders |
| border-hover | `#3E4450` | Hover states |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| accent | `#5E6AD2` | Primary accent (periwinkle/indigo) |
| accent-hover | `#6872E3` | Hover state |
| accent-subtle | `rgba(94, 106, 210, 0.1)` | Backgrounds |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#E2E4E9` | Headings |
| text-secondary | `#8A8F98` | Body text |
| text-tertiary | `#5C616B` | Metadata |

## Typography

### Font
- **Family:** `Inter` (system fallback)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold)

### Scale
| Level | Size | Weight | Line |
|-------|------|--------|------|
| Display | 32px | 600 | 1.2 |
| H1 | 24px | 600 | 1.3 |
| H2 | 18px | 500 | 1.4 |
| Body | 14px | 400 | 1.5 |
| Caption | 12px | 500 | 1.4 |
| Code | 13px | 400 | 1.5 |

### Patterns
- Headings: Medium weight (500), tight leading
- Body: Regular weight, comfortable leading
- All caps for labels: 11px, 500 weight, 0.05em tracking
- Code: Monospace, secondary color

## Spacing

### Scale
| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |

### Patterns
- Cards: 16-20px padding
- Section gaps: 24-32px
- Tight UI: 8-12px

## Border Radius
| Token | Value |
|-------|-------|
| radius-sm | 4px |
| radius-md | 6px |
| radius-lg | 8px |
| radius-xl | 12px |

## Effects

### Shadows (Minimal)
```css
/* Subtle elevation */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

/* Dropdown/menu */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
```

### Focus States
- Ring: 2px offset, accent color
- No browser default outline

## Components

### Buttons
**Primary**
- Background: accent
- Text: white
- Padding: 8px 12px
- Radius: 6px
- Hover: accent-hover

**Secondary**
- Background: bg-tertiary
- Border: 1px solid border
- Hover: border-hover

**Ghost**
- Background: transparent
- Hover: accent-subtle background

### Inputs
- Background: bg-secondary
- Border: 1px solid border
- Padding: 8px 12px
- Radius: 6px
- Focus: accent border

### Cards
- Background: bg-secondary
- Border: 1px solid border
- Radius: 8px
- Padding: 16px
- No shadow (flat)

## Layout Principles

1. **Generous whitespace** — Let content breathe
2. **Clear hierarchy** — Size and weight create structure
3. **Subtle borders** — 1px, low contrast for separation
4. **Minimal shadows** — Flat design preferred
5. **Consistent rhythm** — 8px base grid

## What Makes It Work
- Every element has purpose
- No decorative elements
- Color used sparingly (mostly grayscale + one accent)
- Typography does the heavy lifting
- Interactive states are clear but subtle
