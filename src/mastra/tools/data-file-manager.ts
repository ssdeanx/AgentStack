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
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import * as zlib from 'zlib';
import { z } from 'zod';
import { log } from '../config/logger';
import { trace } from "@opentelemetry/api";


// Define runtime context for these tools
export interface DataFileManagerContext {
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await ensureDataDir();
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📖 Reading file: ' + inputData.fileName, stage: 'read:file' }, id: 'read:file' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const readSpan = tracer.startSpan('read:file', {
      attributes: {
        'tool.id': 'read:file',
        'tool.input.fileName': inputData.fileName,
      }
    });

    try {
      const { fileName } = inputData
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
      readSpan.setAttributes({
        'tool.output.fileSize': content.length
      });
      readSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File read successfully', stage: 'read:file' }, id: 'read:file' });
      return content
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        readSpan.recordException(error);
      }
      readSpan.setStatus({ code: 2, message: errorMessage });
      readSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '💾 Writing to file: ' + inputData.fileName, stage: 'write:file' }, id: 'write:file' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const writeSpan = tracer.startSpan('write:file', {
      attributes: {
        'tool.id': 'write:file',
        'tool.input.fileName': inputData.fileName,
        'tool.input.contentLength': inputData.content.length,
      }
    });

    try {
      const { fileName, content } = inputData
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
      writeSpan.setAttributes({
        'tool.output.success': true
      });
      writeSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File written successfully', stage: 'write:file' }, id: 'write:file' });
      return `File ${fileName} written successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        writeSpan.recordException(error);
      }
      writeSpan.setStatus({ code: 2, message: errorMessage });
      writeSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🗑️ Deleting file: ' + inputData.fileName, stage: 'delete:file' }, id: 'delete:file' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const deleteSpan = tracer.startSpan('delete:file', {
      attributes: {
        'tool.id': 'delete:file',
        'tool.input.fileName': inputData.fileName,
      }
    });

    try {
      const { fileName } = inputData
      const fullPath = validateDataPath(fileName)
      // Defensive: Ensure fullPath is within DATA_DIR before deleting
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path "${fileName}" is outside the allowed data directory.`
        )
      }
      await fs.unlink(fullPath)
      log.info(`Deleted file: ${fileName}`)
      deleteSpan.setAttributes({
        'tool.output.success': true
      });
      deleteSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File deleted successfully', stage: 'delete:file' }, id: 'delete:file' });
      return `File ${fileName} deleted successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        deleteSpan.recordException(error);
      }
      deleteSpan.setStatus({ code: 2, message: errorMessage });
      deleteSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📂 Listing directory: ' + (inputData.dirPath ?? 'docs/data'), stage: 'list:directory' }, id: 'list:directory' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const listSpan = tracer.startSpan('list:directory', {
      attributes: {
        'tool.id': 'list:directory',
        'tool.input.dirPath': inputData.dirPath ?? 'docs/data',
      }
    });

    try {
      const { dirPath = 'docs/data' } = inputData
      const fullPath = validateDataPath(dirPath)
      // Defensive: Ensure fullPath is within DATA_DIR before reading directory
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path "${dirPath}" is outside the allowed data directory.`
        )
      }
      const contents = await fs.readdir(fullPath)
      log.info(`Listed directory: ${dirPath}`)
      listSpan.setAttributes({
        'tool.output.count': contents.length
      });
      listSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory listed successfully', stage: 'list:directory' }, id: 'list:directory' });
      return contents
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        listSpan.recordException(error);
      }
      listSpan.setStatus({ code: 2, message: errorMessage });
      listSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📋 Copying file: ${inputData.sourceFile} to ${inputData.destFile}`, stage: 'copy:file' }, id: 'copy:file' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const copySpan = tracer.startSpan('copy:file', {
      attributes: {
        'tool.id': 'copy:file',
        'tool.input.sourceFile': inputData.sourceFile,
        'tool.input.destFile': inputData.destFile,
      }
    });

    try {
      const { sourceFile, destFile } = inputData
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
      copySpan.setAttributes({
        'tool.output.success': true
      });
      copySpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File copied successfully', stage: 'copy:file' }, id: 'copy:file' });
      return `File ${sourceFile} copied to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        copySpan.recordException(error);
      }
      copySpan.setStatus({ code: 2, message: errorMessage });
      copySpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🚚 Moving file: ${inputData.sourceFile} to ${inputData.destFile}`, stage: 'move:file' }, id: 'move:file' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const moveSpan = tracer.startSpan('move:file', {
      attributes: {
        'tool.id': 'move:file',
        'tool.input.sourceFile': inputData.sourceFile,
        'tool.input.destFile': inputData.destFile,
      }
    });

    try {
      const { sourceFile, destFile } = inputData
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
      moveSpan.setAttributes({
        'tool.output.success': true
      });
      moveSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File moved successfully', stage: 'move:file' }, id: 'move:file' });
      return `File ${sourceFile} moved to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        moveSpan.recordException(error);
      }
      moveSpan.setStatus({ code: 2, message: errorMessage });
      moveSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔍 Searching for pattern: "${inputData.pattern}"`, stage: 'search:files' }, id: 'search:files' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const searchSpan = tracer.startSpan('search:files', {
      attributes: {
        'tool.id': 'search:files',
        'tool.input.pattern': inputData.pattern,
        'tool.input.searchContent': inputData.searchContent,
        'tool.input.dirPath': inputData.dirPath,
      }
    });

    try {
      const {
        pattern,
        searchContent = false,
        dirPath = 'docs/data',
      } = inputData
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
      searchSpan.setAttributes({
        'tool.output.resultCount': results.length
      });
      searchSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Found ${results.length} matches`, stage: 'search:files' }, id: 'search:files' });
      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        searchSpan.recordException(error);
      }
      searchSpan.setStatus({ code: 2, message: errorMessage });
      searchSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: 'ℹ️ Getting info for file: ' + inputData.fileName, stage: 'get:fileinfo' }, id: 'get:fileinfo' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const infoSpan = tracer.startSpan('get:fileinfo', {
      attributes: {
        'tool.id': 'get:fileinfo',
        'tool.input.fileName': inputData.fileName,
      }
    });

    try {
      const { fileName } = inputData
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
      infoSpan.setAttributes({
        'tool.output.fileSize': stats.size,
        'tool.output.isFile': stats.isFile(),
      });
      infoSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File info retrieved', stage: 'get:fileinfo' }, id: 'get:fileinfo' });
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        infoSpan.recordException(error);
      }
      infoSpan.setStatus({ code: 2, message: errorMessage });
      infoSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📁 Creating directory: ' + inputData.dirPath, stage: 'create:directory' }, id: 'create:directory' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const createDirSpan = tracer.startSpan('create:directory', {
      attributes: {
        'tool.id': 'create:directory',
        'tool.input.dirPath': inputData.dirPath,
      }
    });

    try {
      const { dirPath } = inputData
      const fullPath = validateDataPath(dirPath)
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path is outside the allowed data directory.`
        )
      }
      await fs.mkdir(fullPath, { recursive: true })
      log.info(`Created directory: ${dirPath}`)
      createDirSpan.setAttributes({
        'tool.output.success': true
      });
      createDirSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory created successfully', stage: 'create:directory' }, id: 'create:directory' });
      return `Directory ${dirPath} created successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        createDirSpan.recordException(error);
      }
      createDirSpan.setStatus({ code: 2, message: errorMessage });
      createDirSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🗑️ Removing directory: ' + inputData.dirPath, stage: 'remove:directory' }, id: 'remove:directory' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const removeDirSpan = tracer.startSpan('remove:directory', {
      attributes: {
        'tool.id': 'remove:directory',
        'tool.input.dirPath': inputData.dirPath,
      }
    });

    try {
      const { dirPath } = inputData
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
      removeDirSpan.setAttributes({
        'tool.output.success': true
      });
      removeDirSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Directory removed successfully', stage: 'remove:directory' }, id: 'remove:directory' });
      return `Directory ${dirPath} removed successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        removeDirSpan.recordException(error);
      }
      removeDirSpan.setStatus({ code: 2, message: errorMessage });
      removeDirSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📦 Archiving: ${inputData.sourcePath} to ${inputData.archiveName}.gz`, stage: 'archive:data' }, id: 'archive:data' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const archiveSpan = tracer.startSpan('archive:data', {
      attributes: {
        'tool.id': 'archive:data',
        'tool.input.sourcePath': inputData.sourcePath,
        'tool.input.archiveName': inputData.archiveName,
      }
    });

    try {
      const { sourcePath, archiveName } = inputData
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
      archiveSpan.setAttributes({
        'tool.output.success': true
      });
      archiveSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Archive created successfully', stage: 'archive:data' }, id: 'archive:data' });
      return `File ${sourcePath} archived to ${archiveName}.gz successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        archiveSpan.recordException(error);
      }
      archiveSpan.setStatus({ code: 2, message: errorMessage });
      archiveSpan.end();
      throw error
    }
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `💾 Creating backup for: ${inputData.sourcePath}`, stage: 'backup:data' }, id: 'backup:data' });
    const tracer = trace.getTracer('data-file-manager', '1.0.0');
    const backupSpan = tracer.startSpan('backup:data', {
      attributes: {
        'tool.id': 'backup:data',
        'tool.input.sourcePath': inputData.sourcePath,
        'tool.input.backupDir': inputData.backupDir ?? 'backups',
      }
    });

    try {
      const { sourcePath, backupDir = 'backups' } = inputData
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
      backupSpan.setAttributes({
        'tool.output.backupPath': relativeBackupPath
      });
      backupSpan.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Backup created successfully', stage: 'backup:data' }, id: 'backup:data' });
      return `Backup created: ${sourcePath} → ${relativeBackupPath}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        backupSpan.recordException(error);
      }
      backupSpan.setStatus({ code: 2, message: errorMessage });
      backupSpan.end();
      throw error
    }
  },
})

export type BackupDataUITool = InferUITool<typeof backupDataTool>;
