import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataValidatorToolJSON } from "../data-validator.tool";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import type { TracingContext } from "@mastra/core/ai-tracing";

describe("dataValidatorTool", () => {
  const mockContext = {
    get: vi.fn(),
  } as unknown as RuntimeContext;

  const mockTracingContext = {
    currentSpan: {
      createChildSpan: vi.fn().mockReturnValue({
        end: vi.fn(),
        error: vi.fn(),
      }),
    },
  } as unknown as TracingContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate correct data against schema", async () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2 },
        age: { type: "number", min: 0 },
        active: { type: "boolean", optional: true },
      },
    };
    const data = { name: "Alice", age: 30, active: true };

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(true);
    expect(result.cleanedData).toEqual(data);
  });

  it("should return errors for invalid data", async () => {
    const schema = {
      type: "object",
      properties: {
        email: { type: "string", email: true },
      },
    };
    const data = { email: "not-an-email" };

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain("Invalid email");
  });

  it("should handle nested objects", async () => {
    const schema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      },
    };
    const data = { user: { id: 123 } };

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(true);
  });

  it("should handle arrays", async () => {
    const schema = {
      type: "array",
      items: { type: "number" },
    };
    const data = [1, 2, 3];

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(true);
  });

  it("should handle enums", async () => {
    const schema = {
      type: "enum",
      values: ["red", "green", "blue"],
    };
    const data = "yellow";

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("Invalid enum value");
  });

  it("should enforce maxErrors from runtimeContext", async () => {
    const schema = {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" },
        c: { type: "number" },
      },
    };
    const data = { a: "invalid", b: "invalid", c: "invalid" };

    // Mock runtimeContext.get to return maxErrors: 1
    const getMock = mockContext.get as unknown as ReturnType<typeof vi.fn>;
    getMock.mockReturnValue({ maxErrors: 1 });

    const result = await dataValidatorToolJSON.execute({
      context: { data, schema },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBe(2); // 1 error + 1 truncation message
    expect(result.errors?.[1]).toContain("more errors");
  });
});
