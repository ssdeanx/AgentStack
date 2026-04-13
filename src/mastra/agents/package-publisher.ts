import { Agent } from '@mastra/core/agent'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { InternalSpans } from '@mastra/core/observability'
import { LibsqlMemory } from '../config/libsql'

export type PackagePublisherRuntimeContext = AgentRequestContext

const packagePublisherTools = {}

const packages_llm_text = `
# Package Location Rules
- **Core**: packages/{core,deployer,cli,engine,evals,rag,memory,mcp,loggers}
- **Deployers**: deployers/{cloudflare,vercel,netlify} (STRICT: No other dirs)
- **Stores**: stores/{name} (e.g., @mastra/pg -> stores/pg)
- **Speech**: speech/{name} (e.g., @mastra/speech-google -> speech/google)
- **Validation**: No examples/ or integrations/ in paths. Exact matches only.
`

export const PACKAGES_LIST_PROMPT = `
        Please analyze the following monorepo directories and identify packages that need pnpm publishing:
        CRITICAL: This step is about planning. We do not want to build anything. All packages MUST be placed in the correct order.

        Publish Requirements:
        - @mastra/core first, MUST be before any other package
        - all packages in correct dependency order before building
        - Identify packages that have changes requiring a new pnpm publish
        - Include create-mastra in the packages list if changes exist
        - EXCLUDE @mastra/dane from consideration

        Please list all packages that need building grouped by their directory.
        DO NOT build anything during this step. Use workspace search/read tools and sandbox inspection only.
    `

export const BUILD_PACKAGES_PROMPT = (packages: string[]) => `
      <build_execution>
        <context>
          The following packages need to be built in sequence: ${packages.join(', ')}
        </context>

        <execution_plan>
          <phase order="1">
            <!-- Core packages must be built one at a time in this exact order -->
            <step>Use workspace execution to build @mastra/core</step>
            <step>Wait for completion, then use workspace execution to build @mastra/deployer</step>
            <step>Wait for completion, then use workspace execution to build mastra</step>
          </phase>

          <phase order="2">
            <!-- After core packages, build remaining packages by directory -->
            <parallel_phase name="packages">
              <description>Build remaining packages/ directory packages</description>
              <action>Use workspace execution for each remaining package:
                - All @mastra/* packages
                - create-mastra package (in packages/create-mastra)
              </action>
            </parallel_phase>

            <parallel_phase name="integrations">
              <description>Build integrations/ directory packages</description>
              <action>Use workspace execution for each @mastra/integration-* package</action>
            </parallel_phase>

            <parallel_phase name="deployers">
              <description>Build deployers/ directory packages</description>
              <action>Use workspace execution for each @mastra/deployer-* package</action>
            </parallel_phase>

            <parallel_phase name="stores">
              <description>Build stores/ directory packages</description>
              <action>Use workspace execution for each @mastra/* package in stores/</action>
            </parallel_phase>
          </phase>
        </execution_plan>

        <critical_rules>
          <rule>Use workspace execution for each package</rule>
          <rule>Wait for each core package to complete before starting the next</rule>
          <rule>Only start parallel builds after ALL core packages are built</rule>
          <rule>Verify each build succeeds before proceeding</rule>
        </critical_rules>

        <output_format>
          Execute the builds in order and report any failures immediately.
        </output_format>
      </build_execution>
`

export const PUBLISH_PACKAGES_PROMPT = `
      <publish_changeset>
        <context>
          All packages have been successfully built and verified. Now we need to publish the changeset.
        </context>

        <execution_steps>
          <step order="1">
            <action>Use workspace execution to publish all verified packages</action>
            <verification>Ensure the publish command completes successfully</verification>
          </step>
        </execution_steps>

        <critical_rules>
          <rule>Do not proceed if any publish errors occur</rule>
          <rule>Report any failed publishes immediately</rule>
          <rule>Ensure all packages are published atomically</rule>
        </critical_rules>

        <output_format>
          Report the publish status and any errors encountered.
        </output_format>
      </publish_changeset>

`

export const danePackagePublisher = new Agent({
    id: 'danePackagePublisher',
    name: 'DanePackagePublisher',
    instructions: ({ requestContext }) => {
      const userTier = getRoleFromContext(requestContext)
      const language = getLanguageFromContext(requestContext)
        return {
            role: 'system',
            content: `
      I am Dane, a specialized agent for managing pnpm package publications in monorepos. My core responsibilities are:
      User: ${userTier}
      Language: ${language}
      1. Package Analysis:
         - Identify packages requiring publication across the monorepo
         - Detect changes that warrant new version releases
         - Validate package dependencies and versioning

      2. Publication Management:
         - Orchestrate the correct build order for interdependent packages
         - Ensure proper versioning using changesets
         - Maintain package publishing standards

      3. Directory Structure Knowledge:
      ${packages_llm_text}

      Important Guidelines:
      - Always respect package dependencies when determining build order
      - Ensure all necessary builds complete before publishing
      - Follow semantic versioning principles
      - Validate package.json configurations before publishing
      `,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: -1,
                    },
                } satisfies GoogleGenerativeAIProviderOptions,
            },
        }
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: packagePublisherTools,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    scorers: {},
    outputProcessors: [new TokenLimiterProcessor(128000)],
})
