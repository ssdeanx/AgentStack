// Kilocode: Tool Approval
// owner: team-data
// justification: manage corpus files within DATA_DIR
// allowedDomains: []
// allowedDataPaths:
//  - corpus/
//  - docs/data/
// sideEffects:
//  - network: false
//  - write: true
// inputSchema: src/mastra/schemas/tool-schemas.ts::ToolInput
// outputSchema: src/mastra/schemas/tool-schemas.ts::ToolOutput
// approvedBy: sam
// approvalDate: 9/22
//import type { RequestContext } from '@mastra/core/request-context';
import { SpanType } from "@mastra/core/observability";
import type { RequestContext } from "@mastra/core/request-context";
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import * as zlib from 'zlib';
import { z } from 'zod';
import { log } from '../config/logger';


// Define runtime context for these tools
export interface DataFileManagerContext extends RequestContext {
  userId?: string
  workspaceId?: string
}

const DATA_DIR = path.join(process.cwd(), './data')

/**
 * Ensures the data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist, ignore error
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  }
}

/**
 * Ensures the given filePath is within the DATA_DIR.
 * @param filePath The path to validate.
 * @returns The absolute, validated path.
 * @throws Error if the path is outside the allowed data directory.
 */

function validateDataPath(filePath: string): string {
  const absolutePath = path.resolve(DATA_DIR, filePath)
  if (!absolutePath.startsWith(DATA_DIR)) {
    throw new Error(
      `Access denied: File path "${filePath}" is outside the allowed data directory.`
    )
  }
  return absolutePath
}

export const readDataFileTool = createTool({
  id: 'read:file',
  description: 'Reads content from a file within the data directory.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe(
        'The name of the file (relative to the data/ directory).'
      ),
  }),
  outputSchema: z.string().describe('The content of the file as a string.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await ensureDataDir();
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📖 Reading file: ' + input.fileName, stage: 'read:file' }, id: 'read:file' });
    const readSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'read:file',
      input,
      metadata: {
        'tool.id': 'read:file',
        'tool.input.fileName': input.fileName,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { fileName } = input
      const fullPath = validateDataPath(fileName)
      // Resolve the real path to protect against symlink/relative attacks, then validate it is inside DATA_DIR.
      const realFullPath = await fs.realpath(fullPath)
      if (!realFullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path "${fileName}" is outside the allowed data directory.`
        )
      }
      const content = await fs.readFile(realFullPath, 'utf-8')
      log.info(`Read file: ${fileName}`)
      readSpan?.update({
        output: { fileSize: content.length },
        metadata: {
          'tool.output.fileSize': content.length
        }
      });
      readSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File read successfully', stage: 'read:file' }, id: 'read:file' });
      return content
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      readSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Read file tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Read file received complete input', {
      toolCallId,
      messageCount: messages.length,
      fileName: input.fileName,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Read file completed', {
      toolCallId,
      toolName,
      fileSize: output.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export type ReadDataFileUITool = InferUITool<typeof readDataFileTool>;

export const writeDataFileTool = createTool({
  id: 'write:file',
  description:
    'Writes content to a file within the data directory. If the file does not exist, it will be created. If it exists, its content will be overwritten.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe(
        'The name of the file (relative to the data/ directory).'
      ),
    content: z.string().describe('The content to write to the file.'),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '💾 Writing to file: ' + input.fileName, stage: 'write:file' }, id: 'write:file' });
    const writeSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'write:file',
      input,
      metadata: {
        'tool.id': 'write:file',
        'tool.input.fileName': input.fileName,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { fileName, content } = input
      const fullPath = validateDataPath(fileName)
      // Resolve the real path to protect against symlink/relative attacks, then validate it is inside DATA_DIR.
      const realFullPath = await fs.realpath(fullPath)
      if (!realFullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path "${fileName}" is outside the allowed data directory.`
        )
      }
      const realDirPath = path.dirname(realFullPath)
      // Defensive: Ensure realDirPath is within DATA_DIR before creating directory
      if (!realDirPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path "${realDirPath}" is outside the allowed data directory.`
        )
      }
      await fs.mkdir(realDirPath, { recursive: true })
      await fs.writeFile(realFullPath, content, 'utf-8')
      log.info(`Written to file: ${fileName}`)
      writeSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      writeSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File written successfully', stage: 'write:file' }, id: 'write:file' });
      return `File ${fileName} written successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      writeSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Write file tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Write file received complete input', {
      toolCallId,
      messageCount: messages.length,
      fileName: input.fileName,
      contentLength: input.content.length,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Write file completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type WriteDataFileUITool = InferUITool<typeof writeDataFileTool>;

export const deleteDataFileTool = createTool({
  id: 'delete:file',
  description: 'Deletes a file within the data directory.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe(
        'The name of the file (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🗑️ Deleting file: ' + input.fileName, stage: 'delete:file' }, id: 'delete:file' });
    const deleteSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'delete:file',
      input,
      metadata: {
        'tool.id': 'delete:file',
        'tool.input.fileName': input.fileName,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { fileName } = input
      const fullPath = validateDataPath(fileName)
      // Defensive: Ensure fullPath is within DATA_DIR before deleting
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path "${fileName}" is outside the allowed data directory.`
        )
      }
      await fs.unlink(fullPath)
      log.info(`Deleted file: ${fileName}`)
      deleteSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      deleteSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File deleted successfully', stage: 'delete:file' }, id: 'delete:file' });
      return `File ${fileName} deleted successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      deleteSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Delete file tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Delete file received complete input', {
      toolCallId,
      messageCount: messages.length,
      fileName: input.fileName,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Delete file completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type DeleteDataFileUITool = InferUITool<typeof deleteDataFileTool>;

export const listDataDirTool = createTool({
  id: 'list:directory',
  description:
    'Lists files and directories within a specified path in the data directory.',
  inputSchema: z.object({
    dirPath: z
      .string()
      .optional()
      .describe(
        "The path within the data directory to list (e.g., '', 'subfolder/')."
      ),
  }),
  outputSchema: z
    .array(z.string())
    .describe('An array of file and directory names.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📂 Listing directory: ' + (input.dirPath ?? 'docs/data'), stage: 'list:directory' }, id: 'list:directory' });
    const listSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'list:directory',
      input,
      metadata: {
        'tool.id': 'list:directory',
        'tool.input.dirPath': input.dirPath ?? 'docs/data',
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { dirPath = 'docs/data' } = input
      const fullPath = validateDataPath(dirPath)
      // Defensive: Ensure fullPath is within DATA_DIR before reading directory
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path "${dirPath}" is outside the allowed data directory.`
        )
      }
      const contents = await fs.readdir(fullPath)
      log.info(`Listed directory: ${dirPath}`)
      listSpan?.update({
        output: { count: contents.length },
        metadata: {
          'tool.output.count': contents.length
        }
      });
      listSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory listed successfully', stage: 'list:directory' }, id: 'list:directory' });
      return contents
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      listSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('List directory tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('List directory received complete input', {
      toolCallId,
      messageCount: messages.length,
      dirPath: input.dirPath,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('List directory completed', {
      toolCallId,
      toolName,
      itemCount: output.length,
      hook: 'onOutput',
    })
  },
})

export type ListDataDirUITool = InferUITool<typeof listDataDirTool>;

export const copyDataFileTool = createTool({
  id: 'copy:file',
  description: 'Copies a file within the data directory to a new location.',
  inputSchema: z.object({
    sourceFile: z
      .string()
      .describe(
        'The source file path (relative to the data/ directory).'
      ),
    destFile: z
      .string()
      .describe(
        'The destination file path (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📋 Copying file: ${input.sourceFile} to ${input.destFile}`, stage: 'copy:file' }, id: 'copy:file' });
    const copySpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'copy:file',
      input,
      metadata: {
        'tool.id': 'copy:file',
        'tool.input.sourceFile': input.sourceFile,
        'tool.input.destFile': input.destFile,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { sourceFile, destFile } = input
      const sourcePath = validateDataPath(sourceFile)
      const destPath = validateDataPath(destFile)
      // Defensive: Ensure both paths are within DATA_DIR
      if (
        !sourcePath.startsWith(DATA_DIR) ||
        !destPath.startsWith(DATA_DIR)
      ) {
        throw new Error(
          `Access denied: Paths are outside the allowed data directory.`
        )
      }
      const destDir = path.dirname(destPath)
      await fs.mkdir(destDir, { recursive: true })
      await fs.copyFile(sourcePath, destPath)
      log.info(`Copied file: ${sourceFile} to ${destFile}`)
      copySpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      copySpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File copied successfully', stage: 'copy:file' }, id: 'copy:file' });
      return `File ${sourceFile} copied to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      copySpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Copy file tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Copy file received complete input', {
      toolCallId,
      messageCount: messages.length,
      sourceFile: input.sourceFile,
      destFile: input.destFile,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Copy file completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type CopyDataFileUITool = InferUITool<typeof copyDataFileTool>;

export const moveDataFileTool = createTool({
  id: 'move:file',
  description: 'Moves or renames a file within the data directory.',
  inputSchema: z.object({
    sourceFile: z
      .string()
      .describe(
        'The source file path (relative to the data/ directory).'
      ),
    destFile: z
      .string()
      .describe(
        'The destination file path (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🚚 Moving file: ${input.sourceFile} to ${input.destFile}`, stage: 'move:file' }, id: 'move:file' });
    const moveSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'move:file',
      input,
      metadata: {
        'tool.id': 'move:file',
        'tool.input.sourceFile': input.sourceFile,
        'tool.input.destFile': input.destFile,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { sourceFile, destFile } = input
      const sourcePath = validateDataPath(sourceFile)
      const destPath = validateDataPath(destFile)
      // Defensive: Ensure both paths are within DATA_DIR
      if (
        !sourcePath.startsWith(DATA_DIR) ||
        !destPath.startsWith(DATA_DIR)
      ) {
        throw new Error(
          `Access denied: Paths are outside the allowed data directory.`
        )
      }
      const destDir = path.dirname(destPath)
      await fs.mkdir(destDir, { recursive: true })
      await fs.rename(sourcePath, destPath)
      log.info(`Moved file: ${sourceFile} to ${destFile}`)
      moveSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      moveSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File moved successfully', stage: 'move:file' }, id: 'move:file' });
      return `File ${sourceFile} moved to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      moveSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Move file tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Move file received complete input', {
      toolCallId,
      messageCount: messages.length,
      sourceFile: input.sourceFile,
      destFile: input.destFile,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Move file completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type MoveDataFileUITool = InferUITool<typeof moveDataFileTool>;

export const searchDataFilesTool = createTool({
  id: 'search:files',
  description:
    'Searches for files by name pattern or content within the data directory.',
  inputSchema: z.object({
    pattern: z
      .string()
      .describe('The search pattern (regex for name or content).'),
    searchContent: z
      .boolean()
      .optional()
      .describe(
        'Whether to search file content (default: false for name only).'
      ),
    dirPath: z
      .string()
      .optional()
      .describe(
        "The directory to search in (relative to data/, default: '')."
      ),
  }),
  outputSchema: z
    .array(z.string())
    .describe('An array of matching file paths.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔍 Searching for pattern: "${input.pattern}"`, stage: 'search:files' }, id: 'search:files' });
    const searchSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'search:files',
      input,
      metadata: {
        'tool.id': 'search:files',
        'tool.input.pattern': input.pattern,
        'tool.input.searchContent': input.searchContent,
        'tool.input.dirPath': input.dirPath,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const {
        pattern,
        searchContent = false,
        dirPath = 'docs/data',
      } = input
      const searchPath = validateDataPath(dirPath)
      if (!searchPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Search path is outside the allowed data directory.`
        )
      }
      const MAX_PATTERN_LENGTH = 1000
      if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new Error(
          `Pattern too long; maximum allowed length is ${MAX_PATTERN_LENGTH} characters.`
        )
      }
      // Use a case-insensitive literal string search instead of constructing a RegExp from untrusted input.
      const safePattern = pattern.toLowerCase()
      const results: string[] = []

      const searchDir = async (dir: string): Promise<void> => {
        const items = await fs.readdir(dir, { withFileTypes: true })
        for (const item of items) {
          const itemPath = path.join(dir, item.name)
          const relativePath = path.relative(DATA_DIR, itemPath)
          if (item.isDirectory()) {
            await searchDir(itemPath)
          } else if (item.isFile()) {
            if (searchContent) {
              try {
                const content = await fs.readFile(
                  itemPath,
                  'utf-8'
                )
                if (
                  content.toLowerCase().includes(safePattern)
                ) {
                  results.push(relativePath)
                }
              } catch {
                // Skip files that can't be read as text
              }
            } else if (
              item.name.toLowerCase().includes(safePattern)
            ) {
              results.push(relativePath)
            }
          }
        }
      }

      await searchDir(searchPath)
      log.info(`Searched for pattern: ${pattern} in ${dirPath}`)
      searchSpan?.update({
        output: { resultCount: results.length },
        metadata: {
          'tool.output.resultCount': results.length
        }
      });
      searchSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Found ${results.length} matches`, stage: 'search:files' }, id: 'search:files' });
      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      searchSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Search files tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Search files received complete input', {
      toolCallId,
      messageCount: messages.length,
      pattern: input.pattern,
      searchContent: input.searchContent,
      dirPath: input.dirPath,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Search files completed', {
      toolCallId,
      toolName,
      resultCount: output.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export type SearchFilesUITool = InferUITool<typeof searchDataFilesTool>;

export const getDataFileInfoTool = createTool({
  id: 'get:fileinfo',
  description:
    'Gets metadata information about a file within the data directory.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe(
        'The name of the file (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .object({
      size: z.number(),
      modified: z.string(),
      created: z.string(),
      isFile: z.boolean(),
      isDirectory: z.boolean(),
    })
    .describe('File metadata information.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: 'ℹ️ Getting info for file: ' + input.fileName, stage: 'get:fileinfo' }, id: 'get:fileinfo' });
    const infoSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'get:fileinfo',
      input,
      metadata: {
        'tool.id': 'get:fileinfo',
        'tool.input.fileName': input.fileName,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { fileName } = input
      const fullPath = validateDataPath(fileName)
      // Resolve the real path to protect against symlink/relative attacks, then validate it is inside DATA_DIR.
      const realFullPath = await fs.realpath(fullPath)
      if (!realFullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path is outside the allowed data directory.`
        )
      }
      const stats = await fs.stat(realFullPath)
      log.info(`Got info for file: ${fileName}`)
      const result = {
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      }
      infoSpan?.update({
        output: result,
        metadata: {
          'tool.output.fileSize': stats.size,
          'tool.output.isFile': stats.isFile(),
        }
      });
      infoSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File info retrieved', stage: 'get:fileinfo' }, id: 'get:fileinfo' });
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      infoSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Get file info tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Get file info received complete input', {
      toolCallId,
      messageCount: messages.length,
      fileName: input.fileName,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Get file info completed', {
      toolCallId,
      toolName,
      fileSize: output.size,
      isFile: output.isFile,
      hook: 'onOutput',
    })
  },
})

export type GetDataFileInfoUITool = InferUITool<typeof getDataFileInfoTool>;
export const createDataDirTool = createTool({
  id: 'create:directory',
  description: 'Creates a new directory within the data directory.',
  inputSchema: z.object({
    dirPath: z
      .string()
      .describe(
        'The path of the directory to create (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📁 Creating directory: ' + input.dirPath, stage: 'create:directory' }, id: 'create:directory' });
    const createDirSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'create:directory',
      input,
      metadata: {
        'tool.id': 'create:directory',
        'tool.input.dirPath': input.dirPath,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { dirPath } = input
      const fullPath = validateDataPath(dirPath)
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path is outside the allowed data directory.`
        )
      }
      await fs.mkdir(fullPath, { recursive: true })
      log.info(`Created directory: ${dirPath}`)
      createDirSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      createDirSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory created successfully', stage: 'create:directory' }, id: 'create:directory' });
      return `Directory ${dirPath} created successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      createDirSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Create directory tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Create directory received complete input', {
      toolCallId,
      messageCount: messages.length,
      dirPath: input.dirPath,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Create directory completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type CreateDataDirUITool = InferUITool<typeof createDataDirTool>;

export const removeDataDirTool = createTool({
  id: 'remove:directory',
  description: 'Removes an empty directory within the data directory.',
  inputSchema: z.object({
    dirPath: z
      .string()
      .describe(
        'The path of the directory to remove (relative to the data/ directory).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🗑️ Removing directory: ' + input.dirPath, stage: 'remove:directory' }, id: 'remove:directory' });
    const removeDirSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'remove:directory',
      input,
      metadata: {
        'tool.id': 'remove:directory',
        'tool.input.dirPath': input.dirPath,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { dirPath } = input
      const fullPath = validateDataPath(dirPath)
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path is outside the allowed data directory.`
        )
      }
      // Check if directory is empty
      const contents = await fs.readdir(fullPath)
      if (contents.length > 0) {
        throw new Error(`Directory ${dirPath} is not empty.`)
      }
      await fs.rmdir(fullPath)
      log.info(`Removed directory: ${dirPath}`)
      removeDirSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      removeDirSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory removed successfully', stage: 'remove:directory' }, id: 'remove:directory' });
      return `Directory ${dirPath} removed successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      removeDirSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Remove directory tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Remove directory received complete input', {
      toolCallId,
      messageCount: messages.length,
      dirPath: input.dirPath,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Remove directory completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type RemoveDataDirUITool = InferUITool<typeof removeDataDirTool>;

export const archiveDataTool = createTool({
  id: 'archive:data',
  description:
    'Compresses files or directories within the data directory into a gzip archive.',
  inputSchema: z.object({
    sourcePath: z
      .string()
      .describe(
        'The source file or directory path (relative to the data/ directory).'
      ),
    archiveName: z
      .string()
      .describe(
        'The name of the archive file (relative to the data/ directory, without extension).'
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📦 Archiving: ${input.sourcePath} to ${input.archiveName}.gz`, stage: 'archive:data' }, id: 'archive:data' });
    const archiveSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'archive:data',
      input,
      metadata: {
        'tool.id': 'archive:data',
        'tool.input.sourcePath': input.sourcePath,
        'tool.input.archiveName': input.archiveName,
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { sourcePath, archiveName } = input
      const sourceFullPath = validateDataPath(sourcePath)
      const archiveFullPath = validateDataPath(archiveName + '.gz')
      if (
        !sourceFullPath.startsWith(DATA_DIR) ||
        !archiveFullPath.startsWith(DATA_DIR)
      ) {
        throw new Error(
          `Access denied: Paths are outside the allowed data directory.`
        )
      }
      const archiveDir = path.dirname(archiveFullPath)
      await fs.mkdir(archiveDir, { recursive: true })

      const { createReadStream, createWriteStream } = await import('node:fs')
      const gzip = zlib.createGzip()
      const sourceStream = createReadStream(sourceFullPath)
      const archiveStream = createWriteStream(archiveFullPath)

      await pipeline(sourceStream, gzip, archiveStream)
      log.info(`Archived: ${sourcePath} to ${archiveName}.gz`)
      archiveSpan?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true
        }
      });
      archiveSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Archive created successfully', stage: 'archive:data' }, id: 'archive:data' });
      return `File ${sourcePath} archived to ${archiveName}.gz successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      archiveSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Archive data tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Archive data received complete input', {
      toolCallId,
      messageCount: messages.length,
      sourcePath: input.sourcePath,
      archiveName: input.archiveName,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Archive data completed', {
      toolCallId,
      toolName,
      success: output.includes('successfully'),
      hook: 'onOutput',
    })
  },
})

export type ArchiveDataUITool = InferUITool<typeof archiveDataTool>;

export const backupDataTool = createTool({
  id: 'backup:data',
  description:
    'Creates a timestamped backup of a file or directory within the data directory.',
  inputSchema: z.object({
    sourcePath: z
      .string()
      .describe(
        'The source file or directory path (relative to the data/ directory).'
      ),
    backupDir: z
      .string()
      .optional()
      .describe(
        "The backup directory (relative to data/, default: 'backups/')."
      ),
  }),
  outputSchema: z
    .string()
    .describe('A confirmation string indicating success with backup path.'),
  execute: async (input, context) => {
    const writer = context?.writer;
    const requestCtx = context?.requestContext as DataFileManagerContext | undefined;
    const tracingContext = context?.tracingContext;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `💾 Creating backup for: ${input.sourcePath}`, stage: 'backup:data' }, id: 'backup:data' });
    const backupSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'backup:data',
      input,
      metadata: {
        'tool.id': 'backup:data',
        'tool.input.sourcePath': input.sourcePath,
        'tool.input.backupDir': input.backupDir ?? 'backups',
        'user.id': requestCtx?.userId,
      }
    });

    try {
      const { sourcePath, backupDir = 'backups' } = input
      const sourceFullPath = validateDataPath(sourcePath)
      if (!sourceFullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Source path is outside the allowed data directory.`
        )
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const sourceName = path.basename(sourcePath)
      const backupName = `${sourceName}_${timestamp}`
      const backupFullPath = validateDataPath(
        path.join(backupDir, backupName)
      )
      if (!backupFullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Backup path is outside the allowed data directory.`
        )
      }
      const backupParentDir = path.dirname(backupFullPath)
      await fs.mkdir(backupParentDir, { recursive: true })
      await fs.cp(sourceFullPath, backupFullPath, { recursive: true })
      const relativeBackupPath = path.relative(DATA_DIR, backupFullPath)
      log.info(`Backed up: ${sourcePath} to ${relativeBackupPath}`)
      backupSpan?.update({
        output: { backupPath: relativeBackupPath },
        metadata: {
          'tool.output.backupPath': relativeBackupPath
        }
      });
      backupSpan?.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Backup created successfully', stage: 'backup:data' }, id: 'backup:data' });
      return `Backup created: ${sourcePath} → ${relativeBackupPath}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      backupSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Backup data tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Backup data received complete input', {
      toolCallId,
      messageCount: messages.length,
      sourcePath: input.sourcePath,
      backupDir: input.backupDir,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Backup data completed', {
      toolCallId,
      toolName,
      success: output.includes('Backup created'),
      hook: 'onOutput',
    })
  },
})

export type BackupDataUITool = InferUITool<typeof backupDataTool>;
