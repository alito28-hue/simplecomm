---
name: SaaS Operational Excellence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f77'
  primary: '#000001'
  on-primary: '#ffffff'
  primary-container: '#0d1c31'
  on-primary-container: '#76859e'
  inverse-primary: '#b9c7e3'
  secondary: '#006495'
  on-secondary: '#ffffff'
  secondary-container: '#57b9fd'
  on-secondary-container: '#00476d'
  tertiary: '#000102'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f2c'
  on-tertiary-container: '#008ebc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#b9c7e3'
  on-primary-fixed: '#0d1c31'
  on-primary-fixed-variant: '#39475e'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#90cdff'
  on-secondary-fixed: '#001e31'
  on-secondary-fixed-variant: '#004b72'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#75d1ff'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d67'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  warning-amber: '#FFC107'
  success-emerald: '#10B981'
  error-ruby: '#E11D48'
  navy-muted: '#1E293B'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The brand personality for the design system is rooted in **Reliable Innovation**. It targets B2B e-commerce operators who require high-performance tools that reduce cognitive load. The design style follows a **Modern Corporate** aesthetic—a refined evolution of SaaS interfaces that prioritizes clarity, systematic organization, and a sense of "technical calm."

The visual language balances the stability of established financial platforms with the agility of modern cloud technology. Key characteristics include:
- **Clarity over Ornament:** Every element serves a functional purpose.
- **Data-Forward Density:** Information is organized to be scannable at high speeds.
- **Subtle Modernism:** Soft gradients and precise line-work replace heavy shadows or skeuomorphism.

## Colors

The palette is anchored by **Deep Navy (#0D1C31)** to project authority and institutional trust. This is contrasted by **Electric Blue (#0F8CCE)** and **Vibrant Cyan (#00C2FF)**, which act as the primary engines for interaction and visual interest, signaling the platform's tech-forward nature.

- **Primary (Navy):** Used for structural elements like sidebars, primary navigation backgrounds, and high-level headings.
- **Secondary (Electric Blue):** The workhorse color for action states, primary buttons, and active indicators.
- **Tertiary (Cyan):** Reserved for highlight states, data visualizations, and accents that require a sense of "glow" or modernity.
- **Neutrals:** A sophisticated range of cool grays (from #F8FAFC to #64748B) ensures the background remains quiet, allowing data and actions to stand out.

## Typography

This design system utilizes a tiered typography strategy to balance editorial impact with functional utility. 

**Hanken Grotesk** is used for headlines to provide a sharp, contemporary edge that distinguishes the platform from generic system-ui competitors. **Inter** is the primary driver for all body text and data entry, chosen for its exceptional legibility in complex B2B environments. For technical metadata, ID numbers, or SKU codes, **JetBrains Mono** provides a distinct visual bridge to the underlying technology.

- **Scaling:** Headlines shift significantly between desktop and mobile to maintain hierarchy without overwhelming the viewport.
- **Contrast:** High-level headers use heavier weights (600-700) and tighter letter spacing to create a sense of density and professionalism.

## Layout & Spacing

The layout employs a **Fluid Grid with Fixed Constraints**. Content is housed in a 12-column grid on desktop with a maximum width of 1440px to prevent excessive line lengths on ultra-wide monitors.

- **Rhythm:** An 8px base unit (4px for micro-adjustments) governs all padding and margins, ensuring a consistent vertical rhythm.
- **Density:** The design favors "Spacious Functionalism." While generous white space is used to separate logical sections (48px+), internal component spacing remains tight (12-16px) to keep operational data visible "above the fold."
- **Breakpoints:**
  - **Desktop (1024px+):** 12 columns, 24px gutters, 40px margins.
  - **Tablet (768px - 1023px):** 8 columns, 16px gutters, 24px margins.
  - **Mobile (Up to 767px):** 4 columns, 16px gutters, 16px margins.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** supplemented by **Precise Low-Contrast Outlines**. 

- **Surface Levels:** The primary background is the lightest neutral (#F8FAFC). Cards and containers use pure white (#FFFFFF) to pop forward. 
- **Borders:** Instead of heavy shadows, components use a 1px border (#E2E8F0) to define edges. 
- **Shadows:** When elevation is required (e.g., modals or dropdowns), use a "Technical Shadow": a high-diffusion, low-opacity (8-10%) shadow with a subtle Navy tint to maintain color harmony with the brand.
- **Interactivity:** On hover, elements transition through a slight change in background tone or a subtle expansion of the shadow, rather than dramatic color shifts.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional and efficient feel—less "playful" than a fully rounded consumer app, but more modern and approachable than a sharp-edged legacy system.

- **Standard Elements:** Buttons, input fields, and small cards use the `0.25rem` radius.
- **Large Containers:** Dashboard widgets and main content areas may scale up to `0.5rem` (`rounded-lg`) to soften the overall interface.
- **Interactive States:** Focus rings follow the shape of the component with a 2px offset.

## Components

### Buttons
- **Primary:** Solid Electric Blue with white text. High contrast, 0.25rem radius.
- **Secondary:** Navy-tinted outline with Electric Blue text.
- **Ghost:** No background or border, Navy text, used for tertiary actions like "Cancel."

### Input Fields
- Use a 1px #E2E8F0 border with a subtle inner shadow to imply depth.
- On focus, the border transitions to Electric Blue with a soft 2px outer glow (0.15 opacity).
- Labels are positioned above the field in `body-sm` bold.

### Cards & Widgets
- White background with a 1px light gray border.
- Headers within cards should use the Navy-muted color with a thin bottom divider.

### Chips & Badges
- Used for status (e.g., "Shipped", "Pending").
- **Success:** Soft emerald background with dark emerald text.
- **Warning:** Soft amber background with dark amber text.
- Shapes are pill-shaped (full radius) to distinguish them from actionable buttons.

### Navigation
- Sidebar navigation uses the Primary Navy background.
- Active states are marked by a vertical Electric Blue "pill" on the left edge and a subtle Navy-muted background highlight.