---
title: 'ui-dojo/src/mastra/tools/nested-agent-stream-tool.ts at main · mastra-ai/ui-dojo'
source: 'https://github.com/mastra-ai/ui-dojo/blob/main/src/mastra/tools/report-generation-tool.ts'
author:
    - '[[LekoArts]]'
published:
created: 2026-01-13
description: 'Mastra + UI Frameworks. Contribute to mastra-ai/ui-dojo development by creating an account on GitHub.'
tags:
    - 'clippings'
---

[Skip to content](https://github.com/mastra-ai/ui-dojo/blob/main/src/mastra/tools/#start-of-content)

```ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const reportGenerationTool = createTool({
    id: 'generate-report',
    description: 'Generate a report with progress updates',
    inputSchema: z.object({
        topic: z.string().describe('The topic for the report'),
    }),
    outputSchema: z.object({
        report: z.string(),
    }),
    execute: async (inputData, context) => {
        const { topic } = inputData

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Generating report on: ${topic}`,
                stage: 'report-generation',
            },
        })

        await new Promise((resolve) => setTimeout(resolve, 2000))

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Writing report sections...`,
                stage: 'report-generation',
            },
        })

        await new Promise((resolve) => setTimeout(resolve, 1500))

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `Report generated for: ${topic}`,
                stage: 'report-generation',
            },
        })

        return {
            report: `Report on ${topic}: This comprehensive report covers all aspects of the topic with detailed analysis and recommendations.`,
        }
    },
})
```
