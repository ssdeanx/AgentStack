<!-- AGENTS-META {"title":"Next.js App Directory","version":"1.0.0","applies_to":"app/","last_updated":"2025-11-27T00:00:00Z","status":"stable"} -->

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
  "rsc": false,
  "tailwind": {
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  }
}
```

## Related

- `ui/`: Base UI components (19 shadcn/ui primitives)
- `src/components/ai-elements/`: AI-focused components (30)
- `src/mastra/`: Backend agents and tools
- `next.config.ts`: Next.js configuration

---
Last updated: 2025-11-27
