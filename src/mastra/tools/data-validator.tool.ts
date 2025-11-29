import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { AISpanType } from "@mastra/core/ai-tracing";

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
      { let stringSchema = z.string();
      if (def.minLength !== undefined) {stringSchema = stringSchema.min(def.minLength);}
      if (def.maxLength !== undefined) {stringSchema = stringSchema.max(def.maxLength);}
      if (def.email === true) {stringSchema = stringSchema.email();}
      if (def.url === true) {stringSchema = stringSchema.url();}
      schema = stringSchema;
      break; }

    case "number":
      { let numberSchema = z.number();
      if (def.min !== undefined) {numberSchema = numberSchema.min(def.min);}
      if (def.max !== undefined) {numberSchema = numberSchema.max(def.max);}
      if (def.int === true) {numberSchema = numberSchema.int();}
      schema = numberSchema;
      break; }

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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '🔍 Starting data validation' } });
    const rootSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: "data-validator",
      input: { hasData: context.data !== undefined, hasSchema: context.schema !== undefined },
    });

    try {
      const schemaDef = context.schema as unknown as SchemaDefinition;
      const zodSchema = buildZodSchema(schemaDef);

      const result = zodSchema.safeParse(context.data);

      if (result.success) {
        await writer?.write({ type: 'progress', data: { message: `✅ Validation passed` } });
        rootSpan?.end({ output: { valid: true } });
        return {
          valid: true,
          cleanedData: result.data,
        };
      } else {
        const config = runtimeContext?.get("validatorContext");
        const { maxErrors } = config !== undefined ? validatorContextSchema.parse(config) : { maxErrors: undefined };

        let errors = result.error.issues.map((e: z.core.$ZodIssue) => `${e.path.join(".")}: ${e.message}`);

        if (maxErrors !== undefined && errors.length > maxErrors) {
            errors = errors.slice(0, maxErrors);
            errors.push(`...and ${result.error.issues.length - maxErrors} more errors`);
        }

        rootSpan?.end({ output: { valid: false, errorCount: errors.length } });
        return {
          valid: false,
          errors,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
      rootSpan?.error({ error: error instanceof Error ? error : new Error(errorMessage) });
      return {
        valid: false,
        errors: [errorMessage],
      };
    }
  },
});
