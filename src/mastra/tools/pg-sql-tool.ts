import { trace } from "@opentelemetry/api";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { Pool } from "pg";
import { z } from "zod";
import { log } from "../config/logger";


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
  execute: async (inputData, context) => {
    const { query } = inputData;
    const writer = context?.writer;

    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('pg-sql-tool');
    const span = tracer.startSpan('pg-execute', {
      attributes: {
        'tool.id': 'Execute SQL Query',
        'tool.input.query': query,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { message: 'Executing SQL query' } });
    try {
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith("select")) {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      const result = await executeQuery(query);

      span.setAttributes({
        'tool.output.rowCount': result.length
      });
      span.end();

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({ code: 2, message: errorMsg }); // ERROR status
      span.end();

      throw new Error(
        `Failed to execute SQL query: ${errorMsg}`
      );
    }
  },
});

export type PgSqlTool = InferUITool<typeof pgExecute>;
