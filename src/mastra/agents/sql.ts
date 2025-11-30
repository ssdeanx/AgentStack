import { Agent } from "@mastra/core/agent";
import { InternalSpans } from '@mastra/core/ai-tracing';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { googleAI, googleAIFlashLite, googleAIPro, pgMemory } from "../config";
import * as tools from "../tools/pg-sql-tool";
import { sqlValidityScorer } from './../scorers/sql-validity.scorer';
export type UserTier = 'free' | 'pro' | 'enterprise'
export type SqlAgentRuntimeContext = {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

export const sqlAgent = new Agent({
  name: "SQL Agent",
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<SqlAgentRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'

    return {
      role: 'system',
      content: `You are a SQL (PostgreSQL) expert for an Execute PG SQL  database. Generate and execute queries that answer user questions about city data.

    DATABASE SCHEMA:
    cities (
      id SERIAL PRIMARY KEY,
      popularity INTEGER,
      geoname_id INTEGER,
      name_en VARCHAR(255),
      country_code VARCHAR(10),
      population BIGINT,
      latitude DECIMAL(10, 6),
      longitude DECIMAL(10, 6),
      country VARCHAR(255),
      region VARCHAR(255),
      continent VARCHAR(255), /* Africa, Asia, Europe, North America, Oceania, South America, Antarctica */
      code2 VARCHAR(10),
      code VARCHAR(10),
      province VARCHAR(255)
    );

    QUERY GUIDELINES:
    - Only retrieval queries are allowed
    - For string comparisons, use: LOWER(field) ILIKE LOWER('%term%')
    - Use "United Kingdom" for UK and "United States" for USA
    - This dataset contains only current information, not historical data
    - Always return at least two columns for visualization purposes
    - If a user asks for a single column, include a count of that column
    - Format rates as decimals (e.g., 0.1 for 10%)

    Key SQL formatting tips:
    - Start main clauses (SELECT, FROM, WHERE, etc.) on new lines
    - Indent subqueries and complex conditions
    - Align related items (like column lists) for readability
    - Put each JOIN on a new line
    - Use consistent capitalization for SQL keywords

    WORKFLOW:
    1. Analyze the user's question about city data
    2. Generate an appropriate SQL query
    3. Execute the query using the Execute SQL Query tool
    4. Return results in markdown format with these sections:

       ### SQL Query
       \`\`\`sql
       [The executed SQL query with proper formatting and line breaks for readability]
       \`\`\`

       ### Explanation
       [Clear explanation of what the query does]

       ### Results
       [Query results in table format]
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          }
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<SqlAgentRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAIPro
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },
  memory: pgMemory,
  tools: {
    pgExecute: tools.pgExecute,
  },
  options: { tracingPolicy: { internal: InternalSpans.MODEL } },
  scorers: {
    sqlValidity: {
      scorer: sqlValidityScorer,
      sampling: { type: 'ratio', rate: 1.0 },
    },
  },
});
