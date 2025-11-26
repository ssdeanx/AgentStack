import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Pool } from "pg";
import { log } from "../config/logger";
import { AISpanType, InternalSpans } from "@mastra/core/ai-tracing";

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on("error", (err) => {
  log.error("Unexpected error on idle client", err);
});

const executeQuery = async (query: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    throw new Error(
      `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    client.release();
  }
};

export const pgExecute = createTool({
  id: "Execute SQL Query",
  inputSchema: z.object({
    query: z
      .string()
      .describe("SQL query to execute against the cities database"),
  }),
  description: `Executes a SQL query against the cities database and returns the results`,
  execute: async ({ context: { query }, writer, tracingContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pg-execute',
      input: { query },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: 'Executing SQL query' } });
    try {
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith("select")) {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      const result = await executeQuery(query);
      span?.end({ output: { rowCount: result.length } });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      span?.error({ error: error instanceof Error ? error : new Error(errorMsg), endSpan: true });
      throw new Error(
        `Failed to execute SQL query: ${errorMsg}`
      );
    }
  },
});
