import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { AISpanType } from "@mastra/core/ai-tracing";

const csvToolContextSchema = z.object({
  maxRows: z.number().optional(),
});

export const jsonToCsvTool = createTool({
  id: "json-to-csv",
  description: "Convert JSON data to CSV format. Handles arrays of objects.",
  inputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())).describe("Array of JSON objects to convert"),
    options: z
      .object({
        delimiter: z.string().default(",").describe("CSV delimiter character"),
        includeHeaders: z.boolean().default(true).describe("Include header row"),
      })
      .optional()
      .default({
        delimiter: ",",
        includeHeaders: true,
      }),
  }),
  outputSchema: z.object({
    csv: z.string().describe("Generated CSV string"),
    error: z.string().optional(),
  }),
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `📊 Converting ${context.data.length} JSON records to CSV` } });
    const rootSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: "json-to-csv",
      input: { recordCount: context.data.length },
    });

    try {
      const { data, options } = context;
      if (data === undefined || data === null || data.length === 0) {
        return { csv: "" };
      }

      const config = runtimeContext?.get("csvToolContext");
      const { maxRows } = config !== undefined ? csvToolContextSchema.parse(config) : { maxRows: undefined };

      if (maxRows !== undefined && data.length > maxRows) {
        throw new Error(`Data length (${data.length}) exceeds maximum allowed (${maxRows})`);
      }

      // Collect all unique keys for headers
      const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
      const delimiter = options.delimiter || ",";

      const escapeValue = (value: unknown): string => {
        if (value === null || value === undefined) {
          return "";
        }
        let stringValue = "";
        if (typeof value === "object") {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        // If value contains delimiter, quote, or newline, escape it
        if (
          stringValue.includes(delimiter) ||
          stringValue.includes('"') ||
          stringValue.includes("\n") ||
          stringValue.includes("\r")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const rows: string[] = [];

      if (options.includeHeaders) {
        rows.push(headers.map((h) => escapeValue(h)).join(delimiter));
      }

      for (const record of data) {
        const typedRecord = record as Record<string, unknown>;
        const row = headers.map((header) => escapeValue(typedRecord[header]));
        rows.push(row.join(delimiter));
      }

      const csvOutput = rows.join("\n");

      rootSpan?.end({ output: { csvLength: csvOutput.length } });
      return { csv: csvOutput };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error converting to CSV";
      rootSpan?.error({ error: error instanceof Error ? error : new Error(errorMessage) });
      return { csv: "", error: errorMessage };
    }
  },
});

export type JsonToCsvUITool = InferUITool<typeof jsonToCsvTool>;
