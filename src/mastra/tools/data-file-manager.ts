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

import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import * as fs from 'fs/promises';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import * as zlib from 'zlib';
import { z } from 'zod';
import { log } from '../config/logger';


// Define runtime context for these tools
export interface DataFileManagerContext {
  userId?: string
  workspaceId?: string
}

const DATA_DIR = path.join(process.cwd(), 'docs/data')

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
  id: 'read-data-file',
  description: 'Reads content from a file within the data directory.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe(
        'The name of the file (relative to the data/ directory).'
      ),
  }),
  outputSchema: z.string().describe('The content of the file as a string.'),
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '📖 Reading file: ' + context.fileName } });
    const readSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'read_data_file',
      input: { fileName: context.fileName },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { fileName } = context
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
      readSpan?.end({ output: { fileSize: content.length } })
      await writer?.write({ type: 'progress', data: { message: '✅ File read successfully' } });
      return content
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      readSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type ReadDataFileUITool = InferUITool<typeof readDataFileTool>;

export const writeDataFileTool = createTool({
  id: 'write-data-file',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '💾 Writing to file: ' + context.fileName } });
    const writeSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'write_data_file',
      input: {
        fileName: context.fileName,
        contentLength: context.content.length,
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { fileName, content } = context
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
      writeSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ File written successfully' } });
      return `File ${fileName} written successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      writeSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type WriteDataFileUITool = InferUITool<typeof writeDataFileTool>;

export const deleteDataFileTool = createTool({
  id: 'delete-data-file',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '🗑️ Deleting file: ' + context.fileName } });
    const deleteSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'delete_data_file',
      input: { fileName: context.fileName },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { fileName } = context
      const fullPath = validateDataPath(fileName)
      // Defensive: Ensure fullPath is within DATA_DIR before deleting
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: File path "${fileName}" is outside the allowed data directory.`
        )
      }
      await fs.unlink(fullPath)
      log.info(`Deleted file: ${fileName}`)
      deleteSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ File deleted successfully' } });
      return `File ${fileName} deleted successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      deleteSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type DeleteDataFileUITool = InferUITool<typeof deleteDataFileTool>;

export const listDataDirTool = createTool({
  id: 'list-data-directory',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '📂 Listing directory: ' + (context.dirPath ?? 'docs/data') } });
    const listSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'list_data_directory',
      input: { dirPath: context.dirPath ?? 'docs/data' },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { dirPath = 'docs/data' } = context
      const fullPath = validateDataPath(dirPath)
      // Defensive: Ensure fullPath is within DATA_DIR before reading directory
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path "${dirPath}" is outside the allowed data directory.`
        )
      }
      const contents = await fs.readdir(fullPath)
      log.info(`Listed directory: ${dirPath}`)
      listSpan?.end({ output: { count: contents.length } })
      await writer?.write({ type: 'progress', data: { message: '✅ Directory listed successfully' } });
      return contents
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      listSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type ListDataDirUITool = InferUITool<typeof listDataDirTool>;

export const copyDataFileTool = createTool({
  id: 'copy-data-file',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: `📋 Copying file: ${context.sourceFile} to ${context.destFile}` } });
    const copySpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'copy_data_file',
      input: {
        sourceFile: context.sourceFile,
        destFile: context.destFile,
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { sourceFile, destFile } = context
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
      copySpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ File copied successfully' } });
      return `File ${sourceFile} copied to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      copySpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type CopyDataFileUITool = InferUITool<typeof copyDataFileTool>;

export const moveDataFileTool = createTool({
  id: 'move-data-file',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: `🚚 Moving file: ${context.sourceFile} to ${context.destFile}` } });
    const moveSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'move_data_file',
      input: {
        sourceFile: context.sourceFile,
        destFile: context.destFile,
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { sourceFile, destFile } = context
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
      moveSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ File moved successfully' } });
      return `File ${sourceFile} moved to ${destFile} successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      moveSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type MoveDataFileUITool = InferUITool<typeof moveDataFileTool>;

export const searchDataFilesTool = createTool({
  id: 'search-data-files',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: `🔍 Searching for pattern: "${context.pattern}"` } });
    const searchSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'search_data_files',
      input: {
        pattern: context.pattern,
        searchContent: context.searchContent,
        dirPath: context.dirPath,
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const {
        pattern,
        searchContent = false,
        dirPath = 'docs/data',
      } = context
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
      searchSpan?.end({ output: { resultCount: results.length } })
      await writer?.write({ type: 'progress', data: { message: `✅ Found ${results.length} matches` } });
      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      searchSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type SearchDataFilesUITool = InferUITool<typeof searchDataFilesTool>;

export const getDataFileInfoTool = createTool({
  id: 'get-data-file-info',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: 'ℹ️ Getting info for file: ' + context.fileName } });
    const infoSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'get_data_file_info',
      input: { fileName: context.fileName },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { fileName } = context
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
      infoSpan?.end({
        output: { fileSize: stats.size, isFile: stats.isFile() },
      })
      await writer?.write({ type: 'progress', data: { message: '✅ File info retrieved' } });
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      infoSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type GetDataFileInfoUITool = InferUITool<typeof getDataFileInfoTool>;
export const createDataDirTool = createTool({
  id: 'create-data-directory',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '📁 Creating directory: ' + context.dirPath } });
    const createDirSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'create_data_directory',
      input: { dirPath: context.dirPath },
    })

    try {
      const { dirPath } = context
      const fullPath = validateDataPath(dirPath)
      if (!fullPath.startsWith(DATA_DIR)) {
        throw new Error(
          `Access denied: Directory path is outside the allowed data directory.`
        )
      }
      await fs.mkdir(fullPath, { recursive: true })
      log.info(`Created directory: ${dirPath}`)
      createDirSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ Directory created successfully' } });
      return `Directory ${dirPath} created successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      createDirSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type CreateDataDirUITool = InferUITool<typeof createDataDirTool>;

export const removeDataDirTool = createTool({
  id: 'remove-data-directory',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '🗑️ Removing directory: ' + context.dirPath } });
    const removeDirSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'remove_data_directory',
      input: { dirPath: context.dirPath },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { dirPath } = context
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
      removeDirSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ Directory removed successfully' } });
      return `Directory ${dirPath} removed successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      removeDirSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type RemoveDataDirUITool = InferUITool<typeof removeDataDirTool>;

export const archiveDataTool = createTool({
  id: 'archive-data',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: `📦 Archiving: ${context.sourcePath} to ${context.archiveName}.gz` } });
    const archiveSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'archive_data',
      input: {
        sourcePath: context.sourcePath,
        archiveName: context.archiveName,
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { sourcePath, archiveName } = context
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

      const { createReadStream, createWriteStream } = await import('fs')
      const gzip = zlib.createGzip()
      const sourceStream = createReadStream(sourceFullPath)
      const archiveStream = createWriteStream(archiveFullPath)

      await pipeline(sourceStream, gzip, archiveStream)
      log.info(`Archived: ${sourcePath} to ${archiveName}.gz`)
      archiveSpan?.end({ output: { success: true } })
      await writer?.write({ type: 'progress', data: { message: '✅ Archive created successfully' } });
      return `File ${sourcePath} archived to ${archiveName}.gz successfully.`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      archiveSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type ArchiveDataUITool = InferUITool<typeof archiveDataTool>;

export const backupDataTool = createTool({
  id: 'backup-data',
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
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: `💾 Creating backup for: ${context.sourcePath}` } });
    const backupSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'backup_data',
      input: {
        sourcePath: context.sourcePath,
        backupDir: context.backupDir ?? 'backups',
      },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    try {
      const { sourcePath, backupDir = 'backups' } = context
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
      backupSpan?.end({ output: { backupPath: relativeBackupPath } })
      await writer?.write({ type: 'progress', data: { message: '✅ Backup created successfully' } });
      return `Backup created: ${sourcePath} → ${relativeBackupPath}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      backupSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type BackupDataUITool = InferUITool<typeof backupDataTool>;
