---
name: Audigy Arc-Pure
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ef'
  surface-container: '#efeeea'
  surface-container-high: '#eae8e4'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c1a'
  on-surface-variant: '#3f4948'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f0ed'
  outline: '#6f7978'
  outline-variant: '#bec8c7'
  surface-tint: '#226866'
  primary: '#004342'
  on-primary: '#ffffff'
  primary-container: '#0f5c5a'
  on-primary-container: '#8fd2cf'
  inverse-primary: '#90d2cf'
  secondary: '#1d5eac'
  on-secondary: '#ffffff'
  secondary-container: '#78acff'
  on-secondary-container: '#003f7d'
  tertiary: '#6f1f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#972d00'
  on-tertiary-container: '#ffb49c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abefeb'
  primary-fixed-dim: '#90d2cf'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504e'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a8c8ff'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#00468a'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2de'
  paper-base: '#FAF8F4'
  paper-end: '#D7E7F2'
  surface-glass: rgba(255, 255, 255, 0.64)
  surface-solid: '#FFFFFF'
  ink-primary: '#1B1F24'
  ink-secondary: '#4A5260'
  line-border: '#E3DED5'
  focus-ring: '#C2410C'
  blob-teal: '#9FCFCB'
  blob-peach: '#F3C7B4'
  blob-lilac: '#E3D4F0'
  status-good-text: '#1F5FAD'
  status-good-bg: '#E6EEF8'
  status-warn-text: '#9A5800'
  status-warn-bg: '#FBF0DE'
  status-bad-text: '#B3261E'
  status-bad-bg: '#FBE7E5'
  status-neutral-text: '#5F6672'
  status-neutral-bg: '#F1F1EF'
typography:
  display-hero:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system synthesizes the organic, atmospheric delight of Arc Soft with the rigorous didactic clarity of MonScoreSécurité. Designed for website health auditing (security, eco-index, accessibility, Core Web Vitals, privacy), the brand projects calm authority, radical transparency, and effortless sophistication without cognitive noise.

### Design Movement: Luminous Frosted Glass & Editorial Structure
The visual signature balances two worlds:
- **Atmospheric Outer Shell**: A warm-paper to pale-sky background gradient (`#FAF8F4` to `#D7E7F2`) populated with slow-drifting, ambient pastel blobs in seafoam teal, peach, and muted lilac. Frosted glass containers (`backdrop-filter: blur(20px)`) float on top with delicate borders, creating tactile warmth without visual clutter.
- **Single-Column Pedagogical Spine**: An ultra-legible, scannable central layout (450–720px width) inspired by editorial diagnostic reports. Findings are organized strictly: global verdict score first, exactly 3 high-impact priorities next, guided remediation steps third, followed by an actionable tri-state prompt generator (Rien / Vérif / Fix) and multi-domain deep dives.

### Core Tenets & Anti-Slop Discipline
1. **Never Color-Alone**: Every severity and diagnostic metric must combine color, a distinct geometric silhouette (circle for good, warning triangle for caution, solid square for critical, dotted ring for unverified), and an explicit text label.
2. **Zero Synthetic Slop**: No aggressive violet/neon AI gradients, no decorative emojis, no decorative shimmers, and no generic cards-in-a-row grids. Icons are always lightweight linear Lucide glyphs set in subtle rounded plates.
3. **Calm Dignity**: Clear, jargon-free French phrasing in the active voice, honest acknowledgment of unverified parameters, and no forced conversion gates.

## Colors

The palette establishes an airy, crystalline aesthetic centered around deep petrol green, crisp warm paper, and functional diagnostic signaling.

### Roles & Chromatic Hierarchy
- **Primary (`#0F5C5A` - Deep Petrol)**: Grounded, intellectual, and authoritative. Anchors key CTAs, brand signatures, and successful structural highlights.
- **Secondary (`#1F5FAD` - Observational Blue)**: Dedicated to positive health verdicts, verified checks, and informational focal points.
- **Tertiary / Focus (`#C2410C` - Warm Burnt Orange)**: Exclusively reserved for interactive keyboard focus indicators (2px solid with 2px offset) and pressing user calls to attention.
- **Neutral Canvas (`#FAF8F4` to `#D7E7F2`)**: The luminous paper base. Text rides high on `--ink-primary` (`#1B1F24`) delivering a contrast ratio exceeding 16:1 against white and 14:1 against glass cards.

### Functional Diagnostic Tokens
Diagnostic severities rely on strict pairs that respect WCAG AA contrast:
- **Good (A–B / 80–100)**: `#1F5FAD` text on `#E6EEF8` background.
- **To Improve (C–D / 50–79)**: `#9A5800` text on `#FBF0DE` background.
- **Problem (E–F / 0–49)**: `#B3261E` text on `#FBE7E5` background.
- **Not Tested (—)**: `#5F6672` text on `#F1F1EF` background.

The pastel accents (`#9FCFCB`, `#F3C7B4`, `#E3D4F0`) are exclusively deployed as background atmospheric blobs or subtle ambient light sources; they are never applied to UI text or active controls.

## Typography

The typographic hierarchy prioritizes universal legibility, reading endurance, and visual distinction between display moments and precise findings:

- **Outfit**: Commands hero statements, letter grades (A–F), and top-level module banners with its structured geometric elegance and balanced round counterforms.
- **Atkinson Hyperlegible Next**: Powers the structural UI, narrative verdicts, step-by-step resolution guides, and forms. Developed to minimize character ambiguity, it ensures immediate clarity across all cognitive and visual profiles.
- **JetBrains Mono**: Serves inline URL paths, DNS snippets, terminal recommendations, and score differentials. Numbers throughout scores, gauges, and timers must systematically apply `font-variant-numeric: tabular-nums`.

Line length must never exceed `70ch` to maintain fatigue-free scannability. Titles use a tight 1.2 line height while explanatory body prose maintains 1.5.

## Elevation & Depth

Visual hierarchy combines physical translucent glass with singular, ultra-diffused ambient shadowing:

### Frosted Glass Architecture
- **Surface Cards**: Rendered with `background: rgba(255, 255, 255, 0.64)` and backed by `backdrop-filter: blur(20px) saturate(140%)`. To guarantee accessibility under high-transparency backgrounds, a fallback solid plate `#FFFFFF` is established behind nested text containers.
- **Ghost Glass Border**: Every frosted pane is encased in a hairline outline `border: 1px solid rgba(227, 222, 213, 0.30)`. In dark scenarios, this drops to 18% opacity.

### Ambient Elevation
Rather than stepped drop-shadow tiers (z1, z2, z3), the design system relies on a single signature shadow for floating panels, cards, and sticky bars:
- `box-shadow: 0 18px 48px rgba(27, 31, 36, 0.10)`
This wide blur eliminates hard cutoff lines, simulating an ambient light table over the colored pastel blobs beneath.

## Shapes

The shape system expresses gentle warmth through calibrated geometry that avoids exaggerated capsule styling while remaining soft to the touch:

- **Level 2 (Standard Component Radius: `0.5rem` / `8px`)**: Interactive buttons, segmented selector tabs, and input fields.
- **Small Radius (`0.25rem` / `4px`)**: Code chips, metric badges, severity tag hulls, and radio pill containers.
- **Card & Module Radius (`0.75rem` / `12px`)**: Priority finding cards, domain accordions, and report verdict containers.
- **Macro Envelopes (`1rem` / `16px`)**: The main hero glass shell, modal windows, and the sticky interactive bottom tray.

## Components

### 1. Score Gauge & Verdict Header
- **Circular Gauge**: An open arc of 270° with an 8px stroke weight. The track is drawn in `--line-border` (`#E3DED5`), filled dynamically with the severity color according to score. The inner score numeral is scaled proportionally to 20% of the gauge diameter, rendered in tabular Outfit numerals, with a `/100` label below.
- **Letter Badge**: A crisp 64×64px square badge with a 12px border radius, housing the A–F grade in 700 weight Outfit above the severity category.
- **Accessibility**: Includes `role="img"` with descriptive equivalent text (e.g., `aria-label="Score global : 89 sur 100, Bon"`).

### 2. Priority Action Cards
- **Structure**: Glass card with 12px corner radius and a discrete 3px top severity stripe (`#B3261E` for critical, `#9A5800` for warning). No side or bottom colored borders are permitted.
- **Metadata Strip**: Includes numerical index, action title, consequence summary, estimated duration (e.g., `15 min`), difficulty, and responsible actor tag (`Hébergeur`, `Dev`).
- **Actions**: Paired ghost button `[Comment corriger]` and primary outlined button `[+ Ajouter au brief]`.

### 3. Diagnostic Line Items & Tri-State Toggle (Rien / Vérif / Fix)
- **Line Composition**: Compact row containing the composite status indicator (e.g., `#B3261E` solid square + "Problème"), test label, and estimated duration.
- **Segmented Radio Control**: A grouped 3-segment pill control (`Rien`, `Vérif`, `Fix`). The selected segment takes `--accent` (`#0F5C5A`) with pure white text, providing immediate haptic clarity for AI prompt construction.

### 4. Interactive Floating Bottom Bar
- **Position & Styling**: Sticky floating bar pinned to the viewport bottom (`bottom: 1.5rem`), max-width 720px, height 56px, finished with frosted glass (`blur(20px)`), ghost border, and the signature 48px ambient shadow.
- **Content**: Left side reports real-time summary counts (`4 constats · 2 Fix · 2 Vérif`); right side provides `[Générer le brief IA]` in solid petrol green.

### 5. Buttons & Interactive Controls
- **Primary Button**: Solid `--accent` (`#0F5C5A`), text `#FFFFFF`, 8px corner radius, bold Atkinson Hyperlegible Next. Hover state applies an organic brightness shift (200ms ease).
- **Secondary / Ghost Button**: White glass fill with 1px border `--line-border`, text `--ink-primary`.
- **Focus Rings**: All interactive controls present an unmistakable `2px solid #C2410C` outline with a `2px` offset on `:focus-visible`.

### 6. Modal "Comment Corriger"
- **Surface**: Centered glass pane (`max-width: 600px`, radius 16px).
- **Layout**: Segmented host/platform switch (`OVH`, `Netlify`, `Cloudflare`, `Autre`), followed by numbered procedural steps and pre-formatted JetBrains Mono code snippets with one-click copy feedback.