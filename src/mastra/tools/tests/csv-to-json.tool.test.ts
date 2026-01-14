import { beforeEach, describe, expect, it, vi } from 'vitest'
import { csvToJsonTool } from '../csv-to-json.tool'

describe('csvToJsonTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should convert CSV string to JSON successfully', async () => {
    // Arrange
    const csvData = 'name,age,city\nJohn,30,NYC\nJane,25,LA'
    const mockWriter = {
      custom: vi.fn(),
      write: vi.fn(),
    }
    const mockSpan = {
      update: vi.fn(),
      end: vi.fn(),
      error: vi.fn(),
    }
    const mockTracingContext = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue(mockSpan),
      },
    }

    // Act
    
    const result = await csvToJsonTool.execute!(
      {
        csvData,
        options: {
          delimiter: ',',
          columns: true,
          trim: true,
          skip_empty_lines: true,
        },
      },
      {
        writer: mockWriter as any,
        tracingContext: mockTracingContext as any,
        abortSignal: new AbortController().signal,
      }
    )

    // Assert
    expect(result.data).toEqual([
      { name: 'John', age: '30', city: 'NYC' },
      { name: 'Jane', age: '25', city: 'LA' },
    ])
    expect(mockSpan.update).toHaveBeenCalled()
    expect(mockSpan.end).toHaveBeenCalled()
  })

  it('should handle CSV with custom delimiter', async () => {
    // Arrange
    const csvData = 'name;age;city\nJohn;30;NYC'
    const mockWriter = {
      custom: vi.fn(),
      write: vi.fn(),
    }
    const mockSpan = {
      update: vi.fn(),
      end: vi.fn(),
      error: vi.fn(),
    }
    const mockTracingContext = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue(mockSpan),
      },
    }

    // Act
    const result = await csvToJsonTool.execute!(
      {
        csvData,
        options: {
          delimiter: ';',
          columns: true,
          trim: true,
          skip_empty_lines: true,
        },
      },
      {
        writer: mockWriter as any,
        tracingContext: mockTracingContext as any,
        abortSignal: new AbortController().signal,
      }
    )

    // Assert
    expect(result.data).toEqual([{ name: 'John', age: '30', city: 'NYC' }])
  })

  it('should emit progress events', async () => {
        // Arrange
        const csvData = 'name,value\nTest,100'
        const mockWriter: any = {
          custom: vi.fn(),
          write: vi.fn(),
        }
        const mockSpan: any = {
          update: vi.fn(),
          end: vi.fn(),
          error: vi.fn(),
        }
        const mockTracingContext: any = {
          currentSpan: {
            createChildSpan: vi.fn().mockReturnValue(mockSpan),
          },
        }

        // Act
        await csvToJsonTool.execute!(
          {
            csvData,
            options: {
              delimiter: ',',
              columns: true,
              trim: true,
              skip_empty_lines: true,
            },
          },
          {
            writer: mockWriter,
            tracingContext: mockTracingContext,
            abortSignal: new AbortController().signal,
          }
        )

        // Assert
        expect(mockWriter.custom).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'data-tool-progress',
            data: expect.objectContaining({
              status: 'in-progress',
            }),
            id: 'csv-to-json',
          })
        )
      })

  it('should throw error when no CSV data or file path provided', async () => {
    // Arrange
    const mockWriter: any = {
      custom: vi.fn(),
      write: vi.fn(),
    }
    const mockSpan: any = {
      update: vi.fn(),
      end: vi.fn(),
      error: vi.fn(),
    }
    const mockTracingContext: any = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue(mockSpan),
      },
    }
    const controller = new AbortController()

    // Act & Assert
    await expect(
      csvToJsonTool.execute!(
        {
          options: {
            delimiter: ',',
            columns: true,
            trim: true,
            skip_empty_lines: true,
          },
        },
        {
          writer: mockWriter,
          tracingContext: mockTracingContext,
          abortSignal: controller.signal,
        }
      )
    ).rejects.toThrow('Either csvData or filePath must be provided')
  })

  it('should handle abort signal', async () => {
    // Arrange
    const csvData = 'name,value\nTest,100'
    const mockWriter: any = {
      custom: vi.fn(),
      write: vi.fn(),
    }
    const mockSpan = {
      update: vi.fn(),
      end: vi.fn(),
      error: vi.fn(),
    }
    const mockTracingContext: any = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue(mockSpan),
      },
    }
    const controller = new AbortController()
    controller.abort()

    // Act & Assert
    await expect(
      csvToJsonTool.execute!(
        {
          csvData,
          options: {
            delimiter: ',',
            columns: true,
            trim: true,
            skip_empty_lines: true,
          },
        },
        {
          writer: mockWriter,
          tracingContext: mockTracingContext,
          abortSignal: controller.signal,
        }
      )
    ).rejects.toThrow('CSV to JSON conversion cancelled')
  })

  it('should create tracing span with correct metadata', async () => {
    // Arrange
    const csvData = 'name,city\nJohn,NYC'
    const mockWriter: any = {
      custom: vi.fn(),
      write: vi.fn(),
    }
    const mockSpan: any = {
      update: vi.fn(),
      end: vi.fn(),
      error: vi.fn(),
    }
    const mockTracingContext: any = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue(mockSpan),
      },
    }
    const controller = new AbortController()

    // Act
    await csvToJsonTool.execute!(
      {
        csvData,
        options: {
          delimiter: ',',
          columns: true,
          trim: true,
          skip_empty_lines: true,
        },
      },
      {
        writer: mockWriter,
        tracingContext: mockTracingContext,
        abortSignal: controller.signal,
      }
    )

    // Assert
    expect(
      mockTracingContext.currentSpan.createChildSpan
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool_call', // SpanType.TOOL_CALL enum value
        name: 'csv-to-json-conversion',
        input: expect.objectContaining({
          csvData: 'name,city\nJohn,NYC',
          options: expect.objectContaining({
            delimiter: ',',
            columns: true,
          }),
        }),
        metadata: expect.objectContaining({
          'tool.id': 'csv-to-json',
          'tool.input.hasFilePath': false,
          'tool.input.hasCsvData': true,
        }),
      })
    )
  })
})
