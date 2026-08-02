---
name: Premium Real Estate Core
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
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002117'
  on-tertiary-container: '#528f79'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#b0f0d6'
  tertiary-fixed-dim: '#95d3ba'
  on-tertiary-fixed: '#002117'
  on-tertiary-fixed-variant: '#0b513d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  page-margin: 40px
  section-gap: 32px
  card-padding: 24px
  element-gap: 16px
  grid-gutter: 24px
---

## Brand & Style

This design system evolves the "ImmoGest" aesthetic into a high-end, institutional-grade property management interface. It targets property owners and luxury real estate managers who require precision, clarity, and a sense of exclusive reliability.

The style is **Corporate / Modern** with a lean towards **Glassmorphism**. It emphasizes trust through deep, stable color foundations and injects a "premium" feel via meticulous typography and subtle translucency. Visual interest is generated through light—rather than heavy color blocks—using background blurs and high-quality gradients to define hierarchy.

**Design Principles:**
- **Clarity over Clutter:** Generous whitespace (macro-padding) is non-negotiable to prevent cognitive overload.
- **Subtle Luxury:** Depth is created through soft, multi-layered shadows and delicate border treatments.
- **Precise Information Density:** High contrast in typography ensures critical financial data is the immediate focal point.

## Colors

The palette transitions from vibrant, basic tones to a sophisticated, desaturated spectrum.

- **Primary (Deep Navy):** `#0F172A`. Used for the sidebar and main headings to ground the interface in stability.
- **Secondary (Metallic Gold):** `#D4AF37`. Used sparingly for highlights, primary "Premium" actions, and success-state accents.
- **Tertiary (Emerald Night):** `#064E3B`. A refined alternative to standard greens, used for growth indicators and positive financial trends.
- **Neutral Background:** `#F8FAFC`. A cool, crisp white that allows shadows and glass effects to breathe.
- **Accent Palette:** For categorization, use muted versions of the original colors (Slate Blue, Mauve, Sage, Burnt Sienna) to maintain a cohesive, professional atmosphere.

## Typography

The system utilizes a dual-font strategy. **Montserrat** provides a geometric, confident character for headlines and branding, while **Inter** delivers maximum legibility for dense financial data and UI labels.

All labels in navigation and section headers should use the `label-caps` style to differentiate structural elements from user content. For large financial figures (e.g., "Total Cautions"), use `title-md` with a semi-bold weight to ensure prominence without the "loudness" of display sizes.

## Layout & Spacing

This design system uses a **fixed-fluid hybrid grid**. The sidebar remains fixed at 280px, while the main content area occupies a 12-column fluid grid with a maximum container width of 1600px.

**Responsive Behavior:**
- **Desktop:** 12 columns, 24px gutters, 40px outer margins.
- **Tablet:** 8 columns, 16px gutters, 24px outer margins.
- **Mobile:** 4 columns, 16px gutters, 16px outer margins. Cards stack vertically.

Spacing follows a strict 8px linear scale. Use `page-margin` for the distance between the sidebar and the first content card to emphasize the premium feel of "open air."

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glassmorphism**. 

1.  **Level 0 (Base):** The main background (`#F8FAFC`).
2.  **Level 1 (Surface):** Pure white cards with a very soft, multi-layered shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`.
3.  **Level 2 (Active/Premium):** Glassmorphic elements. Used for the active state in the sidebar or featured "Quick Access" items. This requires a `backdrop-filter: blur(12px)` and a white border with `10% opacity`.

Avoid heavy black shadows. All shadows should be tinted with the Primary Navy (`#0F172A`) at very low opacities (3-8%) to maintain a clean, airy look.

## Shapes

The design system uses a **Rounded** philosophy. This strikes a balance between the industrial rigidity of real estate and the modern approachability of a premium SaaS product.

- **Standard Cards:** Use 1rem (`rounded-lg`) for a soft but professional container.
- **Interactive Elements:** Buttons and input fields use 0.5rem (`base`) to feel precise and tactile.
- **Icon Backdrops:** Squircle shapes (continuous curvature) are preferred over perfect circles for a more custom, designer-made appearance.

## Components

### Buttons
Primary buttons use the Primary Navy background with white text. "Premium" actions (e.g., "Upgrade" or "Export Report") use the Gold secondary color. All buttons have a subtle 1px inner light-border to give them a "machined" look.

### Cards
Cards are the primary container. Every card must have a 1px solid border in `#E2E8F0` to maintain definition against the light background. Inner padding should never drop below 24px.

### Navigation (Sidebar)
The sidebar uses a dark-themed glass effect. The background is `#0F172A` at 95% opacity. The "Active" state for a menu item is a glass tile with a left-aligned 4px Gold accent bar.

### Input Fields
Inputs are minimal: white background, 1px light-gray border. On focus, the border transitions to Primary Navy with a subtle 3px outer glow (Primary Navy at 10% opacity).

### Indicators & Chips
Instead of solid colored blocks, use soft-tints (e.g., 10% opacity of the accent color) with high-contrast text. This ensures the dashboard remains colorful but sophisticated.