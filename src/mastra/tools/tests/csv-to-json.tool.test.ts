import { describe, it, expect, vi, beforeEach } from "vitest";
import { csvToJsonTool } from "../csv-to-json.tool";
import * as fs from "node:fs/promises";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import type { TracingContext } from "@mastra/observability";

vi.mock("node:fs/promises");

describe("csvToJsonTool", () => {
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

  it("should parse raw CSV string", async () => {
    const csvData = "name,age\nAlice,30\nBob,25";
    const result = await csvToJsonTool.execute({
      context: {
        csvData,
        options: { delimiter: ",", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.data).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("should parse CSV file", async () => {
    const csvData = "product,price\nApple,1.2\nBanana,0.8";
    vi.mocked(fs.readFile).mockResolvedValue(csvData);

    const result = await csvToJsonTool.execute({
      context: {
        filePath: "/path/to/data.csv",
        options: { delimiter: ",", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(fs.readFile).toHaveBeenCalledWith("/path/to/data.csv", "utf-8");
    expect(result.data).toEqual([
      { product: "Apple", price: "1.2" },
      { product: "Banana", price: "0.8" },
    ]);
  });

  it("should handle custom delimiter", async () => {
    const csvData = "name|role\nAlice|Admin";
    const result = await csvToJsonTool.execute({
      context: {
        csvData,
        options: { delimiter: "|", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.data).toEqual([{ name: "Alice", role: "Admin" }]);
  });

  it("should return error for missing input", async () => {
    const result = await csvToJsonTool.execute({
      context: {
        csvData: undefined,
        filePath: undefined,
        options: { delimiter: ",", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.error).toBeDefined();
    expect(result.data).toEqual([]);
  });

  it("should handle file read error", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

    const result = await csvToJsonTool.execute({
      context: {
        filePath: "/invalid/path.csv",
        options: { delimiter: ",", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.error).toContain("Failed to read file");
  });

  it("should enforce maxRows from runtimeContext", async () => {
    const csvData = "name,age\nAlice,30\nBob,25\nCharlie,35";

    // Mock runtimeContext.get to return maxRows: 2
    const getMock = mockContext.get as unknown as ReturnType<typeof vi.fn>;
    getMock.mockReturnValue({ maxRows: 2 });

    const result = await csvToJsonTool.execute({
      context: {
        csvData,
        options: { delimiter: ",", columns: true, trim: true, skip_empty_lines: true },
      },
      runtimeContext: mockContext,
      tracingContext: mockTracingContext,
    });

    expect(result.error).toContain("exceeds maximum allowed");
  });
});
