---
name: Academic Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434841'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737970'
  outline-variant: '#c3c8be'
  surface-tint: '#496548'
  primary: '#264127'
  on-primary: '#ffffff'
  primary-container: '#3d593d'
  on-primary-container: '#aeceab'
  inverse-primary: '#afcfac'
  secondary: '#626201'
  on-secondary: '#ffffff'
  secondary-container: '#e8e880'
  on-secondary-container: '#686808'
  tertiary: '#003c72'
  on-tertiary: '#ffffff'
  tertiary-container: '#00539a'
  on-tertiary-container: '#a5c8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbebc6'
  primary-fixed-dim: '#afcfac'
  on-primary-fixed: '#06210a'
  on-primary-fixed-variant: '#324d32'
  secondary-fixed: '#e8e880'
  secondary-fixed-dim: '#cccb67'
  on-secondary-fixed: '#1d1d00'
  on-secondary-fixed-variant: '#494900'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#004786'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
  status-success: '#2E7D32'
  status-warning: '#F9A825'
  status-danger: '#BE1F24'
  status-danger-alt: '#FF0000'
  status-info: '#1976D2'
  surface-bg: '#F8FAFC'
  surface-card: '#FFFFFF'
  border-soft: '#E2E8F0'
  text-muted: '#64748B'
typography:
  display-hero:
    fontFamily: Nunito Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  metric-stat:
    fontFamily: Nunito Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Nunito Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system serves an institutional academic tracking and operational attendance environment for technical and vocational institutions such as SENA. The design movement blends **Corporate Modern** with **SaaS Utility Minimalism**: high information density paired with soft, reassuring organic geometry (`rounded-2xl` surfaces) and a distinctively institutional forest palette.

### Personality & Tone
- **Institutional & Trustworthy:** Authoritative yet approachable, mirroring national educational standards with structured layouts, crisp data visualization, and sober visual anchors.
- **Action-Oriented & Clear:** High-contrast status semantics (clear green approvals, cautionary amber warnings, decisive alerts) allowing instructors and academic coordinators to parse attendance anomalies, desertion risks, and class cohort states in seconds.
- **Warm Operational Efficiency:** Soft neutral slates, subtle container boundaries (`#E2E8F0`), and gentle olive undertones prevent cognitive exhaustion over extended administrative use.

## Colors

The color palette centers on national institutional green tones paired with semantic alerting systems calibrated for academic risk monitoring and compliance.

### Roles and Application
- **Primary Brand Green (`#3D593D`):** Anchors top-level chrome including the global persistent header, full-width status banners, primary interactive callouts, active navigation pills, and critical affirmative triggers.
- **Secondary Olive (`#8A8A2D`):** Provides contextual highlights, secondary navigation selections, non-critical status filters, and active tab indicators.
- **Tertiary Institutional Blue (`#1976D2`):** Reserved for audit reports, documentation actions, data charts, and general informational tags.
- **Semantic Status Triad:**
  - `status-success` (`#2E7D32`): 100% verified attendance, on-track course progress, approved justifications.
  - `status-warning` (`#F9A825`): Moderately elevated absences, pending student justifications, threshold alerts.
  - `status-danger` (`#BE1F24`): Desertion hazard, critical attendance drops (>15-35%), immediate administrative intervention needed.
- **Neutral & Canvas Surfaces:**
  - `neutral-slate` (`#1E293B`): Deep slate for body typography, primary data metrics, and high-readability row values.
  - `surface-bg` (`#F8FAFC`): Soft neutral canvas providing low-glare contrast behind crisp `#FFFFFF` data cards.
  - `border-soft` (`#E2E8F0`): Deliberate, light structural containment avoiding heavy borders.

## Typography

The typography uses **Nunito Sans** systematically across all roles to ensure geometric clarity in headlines and exceptional rhythmic legibility across dense administrative tables, metrics, and badges.

### Typographic Hierarchy Guidelines
- **KPI Figures & Metrics (`metric-stat`):** Styled in 30px Bold/ExtraBold. Pair with adjacent micro-badges (`+2%`, `156 planificadas`) in `label-sm` or `body-sm`.
- **Table Data Cells:** Master group codes (e.g., `301002 · ADSO`) receive `body-md` in font-weight 700 with high-contrast `#1E293B`, while program titles underneath utilize `body-sm` in font-weight 400 with muted gray `#64748B`.
- **Badges and Status Chips:** Restrict strictly to `label-sm` with a bold weight (600/700) to ensure high legibility against soft tinted backgrounds.

## Layout & Spacing

The layout is constructed on a 12-column responsive fluid grid with fixed outer max-widths to optimize multi-column administrative workflows.

### Grid & Structure
- **Desktop (>= 1200px):** 12-column grid with `1.5rem` (24px) gutters and a max canvas width of `1440px`. Metric rows divide into a 4-column cluster (25% each). The analytical work area splits into an asymmetric 8-column primary table/chart sector and a 4-column auxiliary incident/audit rail.
- **Tablet (768px – 1199px):** 8-column layout. Metric cards collapse to a 2x2 grid. The primary table and incidents collapse into vertically stacked blocks.
- **Mobile (< 768px):** 4-column layout with `0.75rem` gutters and `1rem` outer margins. Metric cards scroll horizontally or stack vertically. Complex table rows collapse into stacked list cards.

### Spacing Principles
- **Internal Card Padding:** Standard cards utilize `1.5rem` (`space-lg`) internal padding. Compact widgets and incident feeds use `1rem` (`space-md`).
- **Vertical Flow Rhythm:** A standard separation of `1.5rem` (`space-lg`) between major dashboard sections ensures airiness despite dense metrics.

## Elevation & Depth

Visual hierarchy is maintained through subtle surface elevation, low-contrast border boundaries, and tonal layering rather than heavy drop shadows.

### Elevation Levels
- **Canvas Base (Level 0):** The app background sits at `#F8FAFC`.
- **Cards & Surfaces (Level 1):** Solid `#FFFFFF` surfaces enclosed by a 1px solid `#E2E8F0` border. Soft ambient shadow: `0 1px 3px 0 rgba(30, 41, 59, 0.04), 0 1px 2px -1px rgba(30, 41, 59, 0.02)`.
- **Interactive Elevated Containers (Level 2):** Hovered cards, dropdown menus, and popovers feature a subtle lift: `0 8px 16px -4px rgba(30, 41, 59, 0.06), 0 2px 4px -2px rgba(30, 41, 59, 0.03)` with border `#CBD5E1`.
- **Modals & Overlays (Level 3):** Modal dialogs and alert draw-overs use `0 20px 25px -5px rgba(30, 41, 59, 0.1), 0 8px 10px -6px rgba(30, 41, 59, 0.04)` over a semi-transparent dark green backdrop (`rgba(15, 23, 15, 0.45)`).

### Tonal Contrast Rules
- Dark top navigation and hero cards (`#3D593D`) do not receive box-shadows; they maintain authority through sheer tonal dominance and clean vector division.

## Shapes

The design system employs a soft, contemporary silhouette driven by standard 8px (`0.5rem`) and 16px (`1rem` / `rounded-2xl`) curves.

### Geometry Hierarchy
- **Standard Cards & Modals:** `rounded-2xl` (16px) creates a friendly, modern container silhouette that balances institutional authority with accessible warmth.
- **Top Welcome Hero & Large Panels:** `rounded-2xl` (16px) or `rounded-3xl` (24px) for full-width cohesive header units.
- **Form Controls & Action Buttons:** `rounded-lg` (8px) to provide defined, crisp hit targets.
- **Chips, Badges, & Avatar Tokens:** `rounded-full` (9999px) pills for high visual contrast against rectilinear table structures.

## Components

### Buttons
- **Primary Button:** Background `#3D593D`, text `#FFFFFF`, border none, `rounded-lg` (8px), padding `0.5rem 1rem`. Hover state: `#2F452F`. Active state: `#243624`.
- **Secondary / Action Button:** Background `#FFFFFF`, text `#1E293B`, border 1px solid `#E2E8F0`, `rounded-lg` (8px), padding `0.5rem 1rem`. Hover state: background `#F1F5F9`.
- **Critical Action Button:** Background `#BE1F24`, text `#FFFFFF`, `rounded-lg` (8px). Hover state: `#9E191E`.

### Badges & Status Chips
Badges use tinted surface fills with bold saturated text for immediate visual processing:
- **Low Risk / Approved (Green):** Background `#E8F5E9`, text `#2E7D32`, border 1px solid `#C8E6C9`, `rounded-full`, padding `0.2rem 0.65rem`.
- **Moderate Risk / Pending (Yellow/Amber):** Background `#FFF8E1`, text `#F57F17`, border 1px solid `#FFECB3`, `rounded-full`, padding `0.2rem 0.65rem`.
- **Critical Risk / Absent (Red):** Background `#FFEBEE`, text `#C62828`, border 1px solid `#FFCDD2`, `rounded-full`, padding `0.2rem 0.65rem`.
- **Active Navigation Pill:** Inside the dark navigation bar, active items use a translucent white surface (`rgba(255, 255, 255, 0.15)`) with pure `#FFFFFF` typography.

### Input Fields & Selectors
- Background `#FFFFFF`, border 1px solid `#E2E8F0`, `rounded-lg` (8px), padding `0.5rem 0.875rem`, text `#1E293B`.
- Focus state: border-color `#3D593D`, ring `2px solid rgba(61, 89, 61, 0.2)`. Placeholder color `#94A3B8`.
- Integrated search bar includes a prefix search glyph and a subtle clear icon.

### Data Tables & Attendance Rows
- Header rows use `#F8FAFC` background with `11px` bold uppercase text `#64748B`.
- Content rows sit on `#FFFFFF` with alternating or hover surface color `#F8FAFC`. Rows are bounded by a `1px solid #F1F5F9` bottom divider.
- Attendance progress visualizer: horizontal bar (height `6px`, `rounded-full`, background `#E2E8F0`) with dynamic colored fills corresponding to the attendance percentage (`#2E7D32` for ≥85%, `#F9A825` for 65–84%, `#BE1F24` for <65%).

### Metric & KPI Cards
- White `#FFFFFF` card with `rounded-2xl` boundary, `1.25rem` padding, border `1px solid #E2E8F0`.
- Top row aligns label (`body-sm` `#64748B`) with an icon badge inside a soft tinted circular container.
- Value row features `metric-stat` font paired with an inline pill badge indicating period variation (e.g. `+2%`).
- Bottom row provides subtle benchmark context (`Meta institucional: 80% superada`).

### Incident & Notification Cards
- Callout container with light tinted border and soft background:
  - Critical alerts: `#FFF5F5` background, `#FCA5A5` border, with title in `#BE1F24`.
  - Action buttons within alerts: compact size (`0.375rem 0.65rem`), primary button filled with `#BE1F24`, ghost button outlined with `#CBD5E1`.