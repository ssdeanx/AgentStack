<!-- AGENTS-META {"title":"Next.js App Directory","version":"1.0.2","applies_to":"app/","last_updated":"2026-02-16T00:00:00Z","status":"stable"} -->

# Next.js App Directory

## Purpose

This folder contains the **Next.js 16 App Router** pages and layouts for the AgentStack frontend. It provides the entry points for the web interface that connects to Mastra agents.

## Structure

```bash
app/
├── globals.css      # Tailwind CSS 4 styles with oklch color variables
├── layout.tsx       # Root layout (to be configured)
└── test/            # Test pages for development
    ├── action.ts    # Server actions
    ├── form.tsx     # Form components
    └── page.tsx     # Test page
```

## Tech Stack

- **Next.js 16**: App Router with RSC support
- **React 19**: Latest React features
- **Tailwind CSS 4**: Modern CSS with oklch colors
- **tw-animate-css**: Animation utilities

## Styling

Global styles in `globals.css` define:

- **CSS Variables**: oklch color space for precise colors
- **Dark Mode**: `.dark` class selector support
- **Theme Variables**: `--background`, `--foreground`, `--primary`, etc.
- **Component Tokens**: `--radius`, `--border`, `--ring`, etc.

## Configuration

From `components.json`:

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "radix-vega",
    "rsc": true,
    "tsx": true,
    "tailwind": {
        "config": "",
        "css": "app/globals.css",
        "baseColor": "zinc",
        "cssVariables": true,
        "prefix": ""
    },
    "iconLibrary": "lucide"
}
```

## Related

- `ui/`: Base UI components (19 shadcn/ui primitives)
- `src/components/ai-elements/`: AI-focused components (30)
- `src/mastra/`: Backend agents and tools
- `next.config.ts`: Next.js configuration

## Recent Updates

- 2026-02-16: Public subpages upgraded for premium consistency:
  - Migrated major subpage content components to shared `PublicPageHero` with GSAP SVG accents (`blog`, `changelog`, `examples`, `api-reference`, `pricing`, `contact`).
  - Added focus-visible accessibility polish and explicit empty-state handling for list/search-heavy pages.
  - Removed duplicate `Navbar` usage from public route wrappers so navigation is sourced only from root layout.
- 2026-02-15: Added reusable GSAP-powered custom SVG brand animation component at `app/components/gsap/animated-orbital-logo.tsx`.
- 2026-02-15: Integrated animated SVG branding into shared public UI components:
  - `app/components/navbar.tsx`
  - `app/components/landing-hero.tsx`
  - `app/components/footer.tsx`
- Accessibility/perf: each animation path respects `prefers-reduced-motion` behavior.
- 2026-02-16: Added **10-component GSAP SVG suite** under `app/components/gsap/svg-suite/`:
  - `AnimatedSignalPulse`, `AnimatedLiquidBlob`, `AnimatedGradientRings`, `AnimatedDataStream`, `AnimatedNeuralMesh`
  - `AnimatedPrismOrbit`, `AnimatedMorphWaves`, `AnimatedRadarScan`, `AnimatedCircuitGrid`, `AnimatedHelixDna`
- 2026-02-16: Added `app/components/landing-svg-lab.tsx` and wired it into `app/page.tsx` as a public showcase section.
- 2026-02-16: Fixed GSAP registry and reveal behavior:
  - `app/components/gsap/registry.ts`: register only `ScrollTrigger` (removed `useGSAP` from plugin registration)
  - `app/components/primitives/use-section-reveal.ts`: dependencies now include all configurable options for dynamic updates
- 2026-02-16: Fixed root layout provider composition in `app/layout.tsx`:
  - Removed duplicated `children` render
  - Moved `TooltipProvider` inside `ThemeProvider` so tooltips consistently inherit theme context
- 2026-02-16: Added GSAP utility tokens/classes in `app/globals.css` (`--gsap-*`, compositing helpers, reduced-motion utility behavior).

---

Last updated: 2026-02-16
