import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonToCsvTool } from "../json-to-csv.tool";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import type { TracingContext } from "@mastra/observability";

describe("jsonToCsvTool", () => {
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

  it("should convert simple object array to CSV", async () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = await jsonToCsvTool.execute({
      context: {
        data,
        options: { delimiter: ",", includeHeaders: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.csv).toBe("name,age\nAlice,30\nBob,25");
  });

  it("should handle missing keys in some objects", async () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob" }, // Missing age
    ];
    const result = await jsonToCsvTool.execute({
      context: {
        data,
        options: { delimiter: ",", includeHeaders: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    // Header order depends on implementation, but usually first object keys + others
    // Here we expect name,age
    expect(result.csv).toBe("name,age\nAlice,30\nBob,");
  });

  it("should escape special characters", async () => {
    const data = [
      { id: 1, note: 'Hello, "World"' },
      { id: 2, note: "Line\nBreak" },
    ];
    const result = await jsonToCsvTool.execute({
      context: {
        data,
        options: { delimiter: ",", includeHeaders: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.csv).toBe('id,note\n1,"Hello, ""World"""\n2,"Line\nBreak"');
  });

  it("should handle empty data", async () => {
    const result = await jsonToCsvTool.execute({
      context: {
        data: [],
        options: { delimiter: ",", includeHeaders: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.csv).toBe("");
  });

  it("should respect custom delimiter", async () => {
    const data = [{ a: 1, b: 2 }];
    const result = await jsonToCsvTool.execute({
      context: { data, options: { delimiter: ";", includeHeaders: true } },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.csv).toBe("a;b\n1;2");
  });

  it("should enforce maxRows from runtimeContext", async () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
      { name: "Charlie", age: 35 },
    ];

    // Mock runtimeContext.get to return maxRows: 2
    const getMock = mockContext.get as unknown as ReturnType<typeof vi.fn>;
    getMock.mockReturnValue({ maxRows: 2 });

    const result = await jsonToCsvTool.execute({
      context: {
        data,
        options: { delimiter: ",", includeHeaders: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.error).toContain("exceeds maximum allowed");
  });
});
