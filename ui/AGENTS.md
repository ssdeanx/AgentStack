<!-- AGENTS-META {"title":"UI Components (shadcn/ui)","version":"1.0.0","applies_to":"ui/","last_updated":"2025-11-27T00:00:00Z","status":"stable"} -->

# UI Components (shadcn/ui Base)

## Purpose

This folder contains **19 shadcn/ui base components** that serve as the foundation for the AgentStack UI. These are Radix UI primitives styled with Tailwind CSS 4, providing accessible and customizable building blocks.

## Component Inventory (19)

| Component | File | Purpose |
|-----------|------|---------|
| Alert | `alert.tsx` | Status messages and notifications |
| Badge | `badge.tsx` | Labels and status indicators |
| Button | `button.tsx` | Primary action triggers |
| Button Group | `button-group.tsx` | Grouped action buttons |
| Card | `card.tsx` | Content containers |
| Carousel | `carousel.tsx` | Slideable content (embla-carousel) |
| Collapsible | `collapsible.tsx` | Expandable sections |
| Command | `command.tsx` | Command palette (cmdk) |
| Dialog | `dialog.tsx` | Modal dialogs |
| Dropdown Menu | `dropdown-menu.tsx` | Context menus |
| Hover Card | `hover-card.tsx` | Hover-triggered popups |
| Input | `input.tsx` | Text input fields |
| Input Group | `input-group.tsx` | Grouped input with addons |
| Progress | `progress.tsx` | Progress indicators |
| Scroll Area | `scroll-area.tsx` | Custom scrollbars |
| Select | `select.tsx` | Dropdown selection |
| Separator | `separator.tsx` | Visual dividers |
| Textarea | `textarea.tsx` | Multi-line text input |
| Tooltip | `tooltip.tsx` | Hover tooltips |

## Tech Stack

- **Radix UI**: Accessible primitives (`@radix-ui/react-*`)
- **Tailwind CSS 4**: Styling with oklch color variables
- **Class Variance Authority**: Component variants (`cva`)
- **Lucide React**: Icon library

## Usage

Import from `@/components/ui/*`:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

## Configuration

Configured via `components.json`:

- **Style**: `new-york`
- **Base Color**: `zinc`
- **CSS Variables**: Enabled (oklch color space)
- **Icon Library**: `lucide`

## Related

- `src/components/ai-elements/`: AI-focused components (30) that build on these primitives
- `app/globals.css`: CSS variable definitions for theming
- `components.json`: shadcn/ui configuration

---
Last updated: 2025-11-27
