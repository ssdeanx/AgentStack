import type { RequestContext } from '@mastra/core/request-context';
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { trace } from "@opentelemetry/api";
import { z } from "zod";
import { log } from '../config/logger';

const validatorContextSchema = z.object({
  maxErrors: z.number().optional(),
});

// Type definitions for the schema builder
type SchemaType = "string" | "number" | "boolean" | "object" | "array" | "enum";

interface SchemaDefinition {
  type: SchemaType;
  optional?: boolean;
  description?: string;
  // String specific
  minLength?: number;
  maxLength?: number;
  email?: boolean;
  url?: boolean;
  // Number specific
  min?: number;
  max?: number;
  int?: boolean;
  // Object specific
  properties?: Record<string, SchemaDefinition>;
  // Array specific
  items?: SchemaDefinition;
  // Enum specific
  values?: string[];
}

// Helper to build Zod schema from JSON definition
const buildZodSchema = (def: SchemaDefinition): z.ZodTypeAny => {
  let schema: z.ZodTypeAny;

  switch (def.type) {
    case "string":
      {
        let stringSchema = z.string();
        if (def.minLength !== undefined) { stringSchema = stringSchema.min(def.minLength); }
        if (def.maxLength !== undefined) { stringSchema = stringSchema.max(def.maxLength); }
        if (def.email === true) { stringSchema = stringSchema.email(); }
        if (def.url === true) { stringSchema = stringSchema.url(); }
        schema = stringSchema;
        break;
      }

    case "number":
      {
        let numberSchema = z.number();
        if (def.min !== undefined) { numberSchema = numberSchema.min(def.min); }
        if (def.max !== undefined) { numberSchema = numberSchema.max(def.max); }
        if (def.int === true) { numberSchema = numberSchema.int(); }
        schema = numberSchema;
        break;
      }

    case "boolean":
      schema = z.boolean();
      break;

    case "object":
      if (!def.properties) {
        schema = z.record(z.string(), z.any()); // Default to record if no properties
      } else {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, propDef] of Object.entries(def.properties)) {
          shape[key] = buildZodSchema(propDef);
        }
        schema = z.object(shape);
      }
      break;

    case "array":
      if (!def.items) {
        schema = z.array(z.any());
      } else {
        schema = z.array(buildZodSchema(def.items));
      }
      break;

    case "enum":
      if (!def.values || def.values.length === 0) {
        schema = z.string(); // Fallback
      } else {
        // Zod enum requires at least one value, and we need to cast to [string, ...string[]]
        schema = z.enum([def.values[0], ...def.values.slice(1)]);
      }
      break;

    default:
      schema = z.any();
  }

  if (def.description !== undefined && def.description !== null) {
    schema = schema.describe(def.description);
  }

  if (def.optional === true) {
    return schema.optional();
  }

  return schema;
};

export const dataValidatorToolJSON = createTool({
  id: "data-validator-json",
  description: "Validate JSON data against a dynamic schema definition.",
  inputSchema: z.object({
    data: z.any().describe("The data to validate"),
    schema: z.record(z.string(), z.any()).describe("JSON schema definition (custom format)"),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()).optional(),
    cleanedData: z.any().optional(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Data validator tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Data validator received complete input', {
      toolCallId,
      hasData: input.data !== undefined,
      hasSchema: input.schema !== undefined,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Data validator completed', {
      toolCallId,
      toolName,
      valid: output.valid,
      errorCount: output.errors?.length || 0,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const requestContext = context?.requestContext as RequestContext<{ validatorContext: unknown }>; // TODO: unknown is not a type

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔍 Starting data validation', stage: 'data-validator-json' }, id: 'data-validator-json' });

    const tracer = trace.getTracer('data-validator');
    const rootSpan = tracer.startSpan('data-validator', {
      attributes: {
        'tool.id': 'data-validator-json',
        'tool.input.hasData': String(inputData.data !== undefined),
        'tool.input.hasSchema': String(inputData.schema !== undefined),
      }
    });

    try {
      const schemaDef = inputData.schema as unknown as SchemaDefinition;
      const zodSchema = buildZodSchema(schemaDef);

      const result = zodSchema.safeParse(inputData.data);

      if (result.success) {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Validation passed`, stage: 'data-validator-json' }, id: 'data-validator-json' });
        rootSpan.setAttributes({ 'tool.output.valid': true });
        rootSpan.end();
        return {
          valid: true,
          cleanedData: result.data,
        };
      } else {
        const config = requestContext?.get("validatorContext");
        const { maxErrors } = config !== undefined ? validatorContextSchema.parse(config) : { maxErrors: undefined };

        let errors = result.error.issues.map((e: z.core.$ZodIssue) => `${e.path.join(".")}: ${e.message}`);

        if (maxErrors !== undefined && errors.length > maxErrors) {
          errors = errors.slice(0, maxErrors);
          errors.push(`...and ${result.error.issues.length - maxErrors} more errors`);
        }

        rootSpan.setAttributes({ 'tool.output.valid': false, 'tool.output.errorCount': errors.length });
        rootSpan.end();
        return {
          valid: false,
          errors,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: 2, message: errorMessage });
      rootSpan.end();
      return {
        valid: false,
        errors: [errorMessage],
      };
    }
  },
});

export type DataValidatorJSONUITool = InferUITool<typeof dataValidatorToolJSON>;
