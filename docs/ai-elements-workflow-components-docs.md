# AI Elements Workflow Components Documentation

This document contains fetched documentation for all AI Elements workflow components from ai-sdk.dev.

## Workflow Example

Here is some relevant context from the web page https://ai-sdk.dev/elements/examples/workflow:

# Workflow

## Tutorial

### Setup

First, set up a new Next.js repo and cd into it by running the following command (make sure you choose to use Tailwind in the project setup):

Terminal

```
npx create-next-app@latest ai-workflow && cd ai-workflow
```

Run the following command to install AI Elements. This will also set up shadcn/ui if you haven't already configured it:

Terminal

```
npx ai-elements@latest
```

Now, install the required dependencies:

npm pnpm yarn bun

```
npm i @xyflow/react
```

We're now ready to start building our workflow!

### Client

#### Import the components

First, import the necessary AI Elements components in your `app/page.tsx`:

app/page.tsx

```typescript
'use client';

import { Canvas } from '@/components/ai-elements/canvas';
import { Connection } from '@/components/ai-elements/connection';
import { Controls } from '@/components/ai-elements/controls';
import { Edge } from '@/components/ai-elements/edge';
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from '@/components/ai-elements/node';
import { Panel } from '@/components/ai-elements/panel';
import { Toolbar } from '@/components/ai-elements/toolbar';
import { Button } from '@/components/ui/button';
```

#### Define node IDs

Create a constant object to manage node identifiers. This makes it easier to reference nodes when creating edges:

app/page.tsx

```typescript
const nodeIds = {
  start: 'start',
  process1: 'process1',
  process2: 'process2',
  decision: 'decision',
  output1: 'output1',
  output2: 'output2',
};
```

#### Create mock nodes

Define the nodes array with position, type, and data for each node in your workflow:

app/page.tsx

```typescript
const nodes = [
  {
    id: nodeIds.start,
    type: 'workflow',
    position: { x: 0, y: 0 },
    data: {
      label: 'Start',
      description: 'Initialize workflow',
      handles: { target: false, source: true },
      content: 'Triggered by user action at 09:30 AM',
      footer: 'Status: Ready',
    },
  },
  {
    id: nodeIds.process1,
    type: 'workflow',
    position: { x: 500, y: 0 },
    data: {
      label: 'Process Data',
      description: 'Transform input',
      handles: { target: true, source: true },
      content: 'Validating 1,234 records and applying business rules',
      footer: 'Duration: ~2.5s',
    },
  },
  {
    id: nodeIds.decision,
    type: 'workflow',
    position: { x: 1000, y: 0 },
    data: {
      label: 'Decision Point',
      description: 'Route based on conditions',
      handles: { target: true, source: true },
      content: "Evaluating: data.status === 'valid' && data.score > 0.8",
      footer: 'Confidence: 94%',
    },
  },
  {
    id: nodeIds.output1,
    type: 'workflow',
    position: { x: 1500, y: -300 },
    data: {
      label: 'Success Path',
      description: 'Handle success case',
      handles: { target: true, source: true },
      content: '1,156 records passed validation (93.7%)',
      footer: 'Next: Send to production',
    },
  },
  {
    id: nodeIds.output2,
    type: 'workflow',
    position: { x: 1500, y: 300 },
    data: {
      label: 'Error Path',
      description: 'Handle error case',
      handles: { target: true, source: true },
      content: '78 records failed validation (6.3%)',
      footer: 'Next: Queue for review',
    },
  },
  {
    id: nodeIds.process2,
    type: 'workflow',
    position: { x: 2000, y: 0 },
    data: {
      label: 'Complete',
      description: 'Finalize workflow',
      handles: { target: true, source: false },
      content: 'All records processed and routed successfully',
      footer: 'Total time: 4.2s',
    },
  },
];
```

#### Create mock edges

Define the connections between nodes. Use `animated` for active paths and `temporary` for conditional or error paths:

app/page.tsx

```typescript
const edges = [
  {
    id: 'edge1',
    source: nodeIds.start,
    target: nodeIds.process1,
    type: 'animated',
  },
  {
    id: 'edge2',
    source: nodeIds.process1,
    target: nodeIds.decision,
    type: 'animated',
  },
  {
    id: 'edge3',
    source: nodeIds.decision,
    target: nodeIds.output1,
    type: 'animated',
  },
  {
    id: 'edge4',
    source: nodeIds.decision,
    target: nodeIds.output2,
    type: 'temporary',
  },
  {
    id: 'edge5',
    source: nodeIds.output1,
    target: nodeIds.process2,
    type: 'animated',
  },
  {
    id: 'edge6',
    source: nodeIds.output2,
    target: nodeIds.process2,
    type: 'temporary',
  },
];
```

#### Create the node types

Define custom node rendering using the compound Node components:

app/page.tsx

```typescript
const nodeTypes = {
  workflow: ({
    data,
  }: {
    data: {
      label: string;
      description: string;
      handles: { target: boolean; source: boolean };
      content: string;
      footer: string;
    };
  }) => (
    <Node handles={data.handles}>
      <NodeHeader>
        <NodeTitle>{data.label}</NodeTitle>
        <NodeDescription>{data.description}</NodeDescription>
      </NodeHeader>
      <NodeContent>
        <p className="text-sm">{data.content}</p>
      </NodeContent>
      <NodeFooter>
        <p className="text-muted-foreground text-xs">{data.footer}</p>
      </NodeFooter>
      <Toolbar>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
        <Button size="sm" variant="ghost">
          Delete
        </Button>
      </Toolbar>
    </Node>
  ),
};
```

#### Create the edge types

Map the edge type names to the Edge components:

app/page.tsx

```typescript
const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};
```

#### Build the main component

Finally, create the main component that renders the Canvas with all nodes, edges, controls, and custom UI panels:

app/page.tsx

```typescript
const App = () => (
  <Canvas
    edges={edges}
    edgeTypes={edgeTypes}
    fitView
    nodes={nodes}
    nodeTypes={nodeTypes}
    connectionLineComponent={Connection}
  >
    <Controls />
    <Panel position="top-left">
      <Button size="sm" variant="secondary">
        Export
      </Button>
    </Panel>
  </Canvas>
);

export default App;
```

### Key Features

The workflow visualization demonstrates several powerful features:

- Custom Node Components: Each node uses the compound components (`NodeHeader`, `NodeTitle`, `NodeDescription`, `NodeContent`, `NodeFooter`) for consistent, structured layouts.
- Node Toolbars: The `Toolbar` component attaches contextual actions (like Edit and Delete buttons) to individual nodes, appearing when hovering or selecting them.
- Handle Configuration: Nodes can have source and/or target handles, controlling which connections are possible.
- Multiple Edge Types: The `animated` type shows active data flow, while `temporary` indicates conditional or error paths.
- Custom Connection Lines: The `Connection` component provides styled bezier curves when dragging new connections between nodes.
- Interactive Controls: The `Controls` component adds zoom in/out and fit view buttons with a modern, themed design.
- Custom UI Panels: The `Panel` component allows you to position custom UI elements (like buttons, filters, or legends) anywhere on the canvas.
- Automatic Layout: The `Canvas` component auto-fits the view and provides pan/zoom controls out of the box.

You now have a working workflow visualization! Feel free to explore dynamic workflows by connecting this to AI-generated process flows, or extend it with interactive editing capabilities using React Flow's built-in features.

## Canvas

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/canvas:

# Canvas

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add canvas
```

## Features

- Pre-configured React Flow canvas with AI-optimized defaults
- Pan on scroll enabled for intuitive navigation
- Selection on drag for multi-node operations
- Customizable background color using CSS variables
- Delete key support (Backspace and Delete keys)
- Auto-fit view to show all nodes
- Disabled double-click zoom for better UX
- Disabled pan on drag to prevent accidental canvas movement
- Fully compatible with React Flow props and API

## Props

### <Canvas />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Child components to render inside the canvas |
| ...props | ReactFlowProps | - | All other React Flow props are passed through |

## Canvas

A React Flow-based canvas component for building interactive node-based interfaces.

The `Canvas` component provides a React Flow-based canvas for building interactive node-based interfaces. It comes pre-configured with sensible defaults for AI applications, including panning, zooming, and selection behaviors.

The Canvas component is designed to be used with the [Node](https://ai-sdk.dev/elements/components/node) and [Edge](https://ai-sdk.dev/elements/components/edge) components. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Connection

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/connection:

# Connection

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add connection
```

## Features

- Smooth bezier curve animation for connection lines
- Visual indicator circle at the target position
- Theme-aware styling using CSS variables
- Cubic bezier curve calculation for natural flow
- Lightweight implementation with minimal props
- Full TypeScript support with React Flow types
- Compatible with React Flow's connection system

## Props

### <Connection />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| fromX | number | - | Starting X coordinate |
| fromY | number | - | Starting Y coordinate |
| toX | number | - | Ending X coordinate |
| toY | number | - | Ending Y coordinate |

## Connection

A custom connection line component for React Flow-based canvases with animated bezier curve styling.

The `Connection` component provides a styled connection line for React Flow canvases. It renders an animated bezier curve with a circle indicator at the target end, using consistent theming through CSS variables.

The Connection component is designed to be used with the [Canvas](https://ai-sdk.dev/elements/components/canvas) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Controls

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/controls:

# Controls

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add controls
```

## Features

- Zoom in/out controls
- Fit view button to center and scale content
- Rounded pill design with backdrop blur
- Theme-aware card background
- Subtle drop shadow for depth
- Full TypeScript support
- Compatible with all React Flow control features

## Props

### <Controls />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |
| ...props | ReactFlowControlsProps | - | All other React Flow Controls props |

## Controls

A styled controls component for React Flow-based canvases with zoom and fit view functionality.

The `Controls` component provides interactive zoom and fit view controls for React Flow canvases. It includes a modern, themed design with backdrop blur and card styling.

The Controls component is designed to be used with the [Canvas](https://ai-sdk.dev/elements/components/canvas) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Edge

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/edge:

# Edge

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add edge
```

## Features

- Two distinct edge types: Temporary and Animated
- Temporary edges use dashed lines with ring color
- Animated edges include a moving circle indicator
- Automatic handle position calculation
- Smart offset calculation based on handle type and position
- Uses Bezier curves for smooth, natural-looking connections
- Fully compatible with React Flow's edge system
- Type-safe implementation with TypeScript

## Edge Types

### Edge.Temporary

A dashed edge style for temporary or preview connections. Uses a simple Bezier path with a dashed stroke pattern.

### Edge.Animated

A solid edge with an animated circle that moves along the path. The animation repeats indefinitely with a 2-second duration, providing visual feedback for active connections.

## Props

Both edge types accept standard React Flow `EdgeProps`:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | - | Unique identifier for the edge |
| source | string | - | ID of the source node |
| target | string | - | ID of the target node |
| sourceX | number | - | X coordinate of source handle |
| sourceY | number | - | Y coordinate of source handle |
| targetX | number | - | X coordinate of target handle |
| targetY | number | - | Y coordinate of target handle |
| sourcePosition | Position | - | Position of source handle |
| targetPosition | Position | - | Position of target handle |
| markerEnd | string | - | SVG marker for the end of the edge |
| style | CSSProperties | - | Custom styles for the edge |

## Edge

Customizable edge components for React Flow canvases with animated and temporary states.

The `Edge` component provides two pre-styled edge types for React Flow canvases: `Temporary` for dashed temporary connections and `Animated` for connections with animated indicators.

The Edge component is designed to be used with the [Canvas](https://ai-sdk.dev/elements/components/canvas) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Node

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/node:

# Node

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add node
```

## Features

- Built on shadcn/ui Card components for consistent styling
- Automatic handle placement (left for target, right for source)
- Composable sub-components (Header, Title, Description, Action, Content, Footer)
- Semantic structure for organizing node information
- Pre-styled sections with borders and backgrounds
- Responsive sizing with fixed small width
- Full TypeScript support with proper type definitions
- Compatible with React Flow's node system

## Props

### <Node />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| handles | { target?: boolean; source?: boolean } | - | Configuration for connection handles |
| className | string | - | Additional CSS classes |
| ...props | HTMLDivElement | - | Standard div props |

### <NodeHeader />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |
| ...props | HTMLDivElement | - | Standard div props |

### <NodeTitle />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| ...props | HTMLHeadingElement | - | Standard heading props |

### <NodeDescription />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| ...props | HTMLParagraphElement | - | Standard paragraph props |

### <NodeAction />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| ...props | HTMLButtonElement | - | Standard button props |

### <NodeContent />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |
| ...props | HTMLDivElement | - | Standard div props |

### <NodeFooter />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |
| ...props | HTMLDivElement | - | Standard div props |

## Node

A composable node component for React Flow-based canvases with Card-based styling.

The `Node` component provides a composable, Card-based node for React Flow canvases. It includes support for connection handles, structured layouts, and consistent styling using shadcn/ui components.

The Node component is designed to be used with the [Canvas](https://ai-sdk.dev/elements/components/canvas) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Panel

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/panel:

# Panel

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add panel
```

## Features

- Flexible positioning (top-left, top-right, bottom-left, bottom-right, top-center, bottom-center)
- Rounded pill design with backdrop blur
- Theme-aware card background
- Flexbox layout for easy content alignment
- Subtle drop shadow for depth
- Full TypeScript support
- Compatible with React Flow's panel system

## Props

### <Panel />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| position | 'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right' \| 'top-center' \| 'bottom-center' | 'bottom-left' | Position of the panel on the canvas |
| className | string | - | Additional CSS classes |
| ...props | HTMLDivElement | - | Standard div props |

## Panel

A styled panel component for React Flow-based canvases to position custom UI elements.

The `Panel` component provides a positioned container for custom UI elements on React Flow canvases. It includes modern card styling with backdrop blur and flexible positioning options.

The Panel component is designed to be used with the [Canvas](https://ai-sdk.dev/elements/components/canvas) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

## Toolbar

Here is some relevant context from the web page https://ai-sdk.dev/elements/components/toolbar:

# Toolbar

## Installation

AI Elements shadcn CLI Manual

```
npx ai-elements@latest add toolbar
```

## Features

- Attaches to any React Flow node
- Bottom positioning by default
- Rounded card design with border
- Theme-aware background styling
- Flexbox layout with gap spacing
- Full TypeScript support
- Compatible with all React Flow NodeToolbar features

## Props

### <Toolbar />

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |
| ...props | NodeToolbarProps | - | All React Flow NodeToolbar props |

## Toolbar

A styled toolbar component for React Flow nodes with flexible positioning and custom actions.

The `Toolbar` component provides a positioned toolbar that attaches to nodes in React Flow canvases. It features modern card styling with backdrop blur and flexbox layout for action buttons and controls.

The Toolbar component is designed to be used with the [Node](https://ai-sdk.dev/elements/components/node) component. See the [Workflow](https://ai-sdk.dev/elements/examples/workflow) demo for a full example.

---

*Documentation fetched from ai-sdk.dev on December 8, 2025*