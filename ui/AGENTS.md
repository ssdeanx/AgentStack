<!-- AGENTS-META {"title":"UI Components","version":"1.0.0","applies_to":"ui/","last_updated":"2026-02-16T00:00:00Z","status":"stable"} -->

# UI Components

## Overview

Base UI component library built on shadcn/ui conventions, utilizing Radix UI primitives and Tailwind CSS 4 for accessible, high-performance interfaces.

## Component Categories

### Layout & Structure

- **Containers**: `card.tsx`, `layout.tsx`, `sidebar.tsx`, `resizable.tsx`
- **Organization**: `separator.tsx`, `scroll-area.tsx`, `breadcrumb.tsx`, `pagination.tsx`

### Forms & Inputs

- **Actions**: `button.tsx`, `button-group.tsx`, `theme-toggle.tsx`
- **Text Inputs**: `input.tsx`, `textarea.tsx`, `input-group.tsx`, `input-otp.tsx`
- **Selection**: `checkbox.tsx`, `radio-group.tsx`, `select.tsx`, `switch.tsx`, `slider.tsx`
- **Labels**: `label.tsx`, `kbd.tsx`

### Feedback & Status

- **Indicators**: `progress.tsx`, `spinner.tsx`, `skeleton.tsx`
- **Notifications**: `alert.tsx`, `sonner.tsx`
- **States**: `empty.tsx`

### Overlays & Navigation

- **Modals**: `dialog.tsx`, `sheet.tsx`
- **Popups**: `popover.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`
- **Menus**: `navigation-menu.tsx`, `tabs.tsx`, `command.tsx`

### Data & Content

- **Display**: `table.tsx`, `chart.tsx`, `carousel.tsx`, `accordion.tsx`
- **Elements**: `avatar.tsx`, `badge.tsx`, `typography.tsx`

### Visual Effects (`ui/effects/`)

- **Motion**: `animated-beam.tsx`, `background-beams.tsx`, `border-beam.tsx`
- **Layouts**: `bento-grid.tsx`, `card-spotlight.tsx`, `spotlight.tsx`
- **Text**: `text-generate.tsx`

## Where to Look

- `ui/`: Core component implementations and variants.
- `ui/effects/`: Advanced visual and motion-rich components.
- `ui/helpers.tsx`: Shared UI utility functions and context providers.
- `components.json`: shadcn/ui configuration and path aliases.

## Usage

Components are designed to be imported individually. Most components support standard Tailwind classes for styling overrides and follow Radix UI's accessibility patterns.
