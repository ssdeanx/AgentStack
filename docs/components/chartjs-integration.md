# Chart.js Integration using chartjs.tool.ts

This document explains how to use the server-side tool src/mastra/tools/chartjs.tool.ts to produce Chart.js configuration objects and render them in a Next.js (App Router) UI. It covers recommended patterns (server-side tool execution via a Next.js API route), a direct client call option (less recommended), progress handling, and sample code for a React component using react-chartjs-2.

---

## Overview

- The tool `chartjs-generator` (src/mastra/tools/chartjs.tool.ts) accepts time series data and a list of indicators and returns a Chart.js `config` object:
  - Input (trimmed): { data: [{ date, close, open?, high?, low?, volume? }], indicators?: [{ type, period, color, ... }], chartType?: 'line'|'bar'|'candlestick', title?: string }
  - Output: { config: ChartConfiguration }

- Best practice: execute the tool server-side (Next.js server API route or server component) and send the resulting config JSON to the browser to render via Chart.js. This avoids exposing server-side system access and keeps sensitive logic on the server.

---

## Prerequisites

1. Mastra server running (local default: http://localhost:4111). Set NEXT_PUBLIC_MASTRA_API_URL for client-only use and configure a server-side Mastra client with any required auth.
2. Ensure `chartjs.tool.ts` is imported/registered in the server tools registry so the tool id `chartjs-generator` is available.
3. Install Chart.js and React wrapper (example uses `react-chartjs-2`), plus recommended helper plugins and adapters:

```bash
npm install chart.js react-chartjs-2 chartjs-adapter-date-fns chartjs-plugin-zoom downsample-lttb
```

- `chartjs-adapter-date-fns` provides date parsing for time axes
- `chartjs-plugin-zoom` enables client zoom/pan interactions when desired
- `downsample-lttb` is a server-side friendly LTTB downsampling helper (useful for very large datasets)

4. (Optional) Install `zod` for input validation on the server and client if you want extra checks (the tool already uses a Zod schema internally).

---

## Register the tool on server (example)

If you maintain a module that exports tools, import the tool and add it to your Mastra/MCP server configuration so it's discoverable.

Example (server-side entry point):

```ts
// src/mastra/tools/index.ts
import { chartJsTool } from './chartjs.tool'

export const tools = {
  chartJsTool,
  // other tools ...
}

// When creating your Mastra instance or MCP server, include the tools object
```

---

## Recommended: Server-side API route (Next.js app) that calls the tool

Run the tool on the server and return the config to the client. This is the recommended flow for security and reliability.

Example: app/api/chart-config/route.ts (Next.js App Router server route)

```ts
// app/api/chart-config/route.ts
import { NextResponse } from 'next/server'
import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({ baseUrl: process.env.MASTRA_API_URL || 'http://localhost:4111' })

export async function POST(request: Request) {
  const body = await request.json()

  // Validate body as needed here (optional, use Zod)

  try {
    // Call the tool directly via the client Tools API
    const tool = mastraClient.getTool('chartjs-generator')
    const result = await tool.execute({ args: body })

    return NextResponse.json(result)
  } catch (err) {
    console.error('chart config generation failed', err)
    return new NextResponse(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
```

Notes:
- Running the tool on the server allows you to keep server-side dependencies and CPU work away from browsers.
- `body` should include `data` (time series) and optional `indicators`.

---

## Client: React component that fetches config and renders Chart.js

This client component fetches the generated Chart.js config and renders it with react-chartjs-2.

```tsx
// app/examples/chart-viewer/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Chart } from 'react-chartjs-2'
import type { ChartConfiguration } from 'chart.js'

export default function ChartViewer({ sampleData }) {
  const [config, setConfig] = useState<ChartConfiguration | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sampleData) return

    async function fetchConfig() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/chart-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleData),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to generate chart config')

        setConfig(json.config)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [sampleData])

  if (loading) return <div>Generating chart…</div>
  if (error) return <div>Error: {error}</div>
  if (!config) return <div>No chart to show</div>

  return (
    <div>
      <Chart type={config.type as any} data={config.data as any} options={config.options as any} />
    </div>
  )
}
```

Client considerations:
- Use a server API route to call the tool (recommended) and return only the chart configuration.
- Keep the returned payload size reasonable (large datasets can be heavy to transfer).

---

## Alternative: Direct client-side tool execution

It is possible to call `mastraClient.getTool('chartjs-generator')` directly from the browser with `@mastra/client-js`, but **this is only safe if your Mastra server has no secret-auth requirements or you use an appropriate public token**. Prefer the server-side route in production.

Example direct call (not recommended for production):

```ts
import { MastraClient } from '@mastra/client-js'
const mastraClient = new MastraClient({ baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL })
const tool = mastraClient.getTool('chartjs-generator')
const result = await tool.execute({ args: { data: ..., indicators: [...] } })
// result.config -> render
```

Security reminder:
- Do not embed private API keys or tokens in client code.
- Validate inputs both client- and server-side using Zod to avoid malformed or malicious inputs.

---

## Handling progress and streaming events

The tool uses `context.writer.custom(...)` to emit progress events (type: `data-tool-progress`). If you call the tool directly via a synchronous `tool.execute()` you will typically only receive the final output. To receive progress events you should:

- Call the tool from an agent flow that produces a stream (server) and then stream results to the client using `agent.stream()` or Mastra streaming APIs, or
- Use server-side streaming and forward the custom messages to web clients via SSE or WebSocket while the tool runs.

Example: server-side streaming architecture

1. Start the tool from a server process that collects `context.writer` messages during execution.
2. Expose an SSE/WebSocket endpoint to forward progress messages to the browser.
3. Update UI progressively as you receive `data-tool-progress` messages.

Note: implementing progress streaming is more advanced. For a simple PoC, synchronous execution with UI loading state is sufficient.

---

## Data shape and indicator options

- Each row in `data` must include at minimum `{ date: string, close: number }`.
- Supported indicator types (from the tool): SMA, EMA, RSI, MACD, BollingerBands. See src/mastra/tools/chartjs.tool.ts for available options and parameters.

Example payload:

```json
{
  "data": [{ "date": "2025-12-01", "close": 98.1 }, { "date": "2025-12-02", "close": 99.5 }],
  "indicators": [{ "type": "SMA", "period": 10, "color": "#ff0000" }],
  "chartType": "line",
  "title": "Price + SMA"
}
```

---

## Testing & E2E

- Unit test the chart tool logic (already server-side): add tests that exercise indicator calculations and returned config (Vitest).
- E2E: Render the UI page and assert the chart appears and expected dataset counts exist. Use Playwright to check that the fetched config leads to a visible <canvas> element and that datasets match expected lengths.

---

## Troubleshooting

- If chart fails to render, log and inspect the returned `config` object; Chart.js expects `labels` and `datasets` in data as arrays.
- If indicators appear shifted, check the padding of `null` values the tool uses to align indicator arrays with baseline close prices.
- For large datasets, try sampling or server-side aggregation to keep payload compact.

---

## Example files included in this repo

- src/mastra/tools/chartjs.tool.ts — server-side Chart.js config generator (this file)
- (New) app/api/chart-config/route.ts — example server route that calls tool
- (New) app/examples/chart-viewer/page.tsx — example client that fetches and renders the config

---

If you want, I can create the example API route and the client page in the repo now (including a small sample dataset and a Playwright test). Which location would you prefer for the example page: `app/examples/chart-viewer` or `app/chat/examples/chart-viewer`?