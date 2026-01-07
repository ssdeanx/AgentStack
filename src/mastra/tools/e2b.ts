import { FilesystemEventType, FileType, Sandbox } from '@e2b/code-interpreter';
import { createTool } from '@mastra/core/tools';
import z from 'zod';
import { log } from '../config/logger';

export const createSandbox = createTool({
  id: 'createSandbox',
  description: 'Create an e2b sandbox',
  inputSchema: z.object({
    metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata for the sandbox'),
    envs: z.record(z.string(), z.string()).optional().describe(`
      Custom environment variables for the sandbox.
      Used when executing commands and code in the sandbox.
      Can be overridden with the \`envs\` argument when executing commands or code.
    `),
    timeoutMS: z.number().optional().describe(`
      Timeout for the sandbox in **milliseconds**.
      Maximum time a sandbox can be kept alive is 24 hours (86_400_000 milliseconds) for Pro users and 1 hour (3_600_000 milliseconds) for Hobby users.
      @default 300_000 // 5 minutes
    `),
  }),
  outputSchema: z.object({
    sandboxId: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Create sandbox tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Create sandbox received complete input', {
      toolCallId,
      hasMetadata: !!input.metadata,
      hasEnvs: !!input.envs,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Create sandbox completed', {
      toolCallId,
      toolName,
      sandboxId: output.sandboxId,
      hook: 'onOutput',
    })
  },
  execute: async (sandboxOptions) => {
    try {
      const sandbox = await Sandbox.create(sandboxOptions);

      return {
        sandboxId: sandbox.sandboxId,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const runCode = createTool({
  id: 'runCode',
  description: 'Run code in an e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to run the code'),
    code: z.string().describe('The code to run in the sandbox'),
    runCodeOpts: z
      .object({
        language: z
          .enum(['ts', 'js', 'python'])
          .default('python')
          .describe('language used for code execution. If not provided, default python context is used'),
        envs: z.record(z.string(), z.string()).optional().describe('Custom environment variables for code execution.'),
        timeoutMS: z.number().optional().describe(`
        Timeout for the code execution in **milliseconds**.
        @default 60_000 // 60 seconds
      `),
        requestTimeoutMs: z.number().optional().describe(`
        Timeout for the request in **milliseconds**.
        @default 30_000 // 30 seconds
      `),
      })
      .optional()
      .describe('Run code options'),
  }),
  outputSchema: z.object({
    execution: z.string().describe('Serialized representation of the execution results'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Run code tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Run code received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      codeLength: input.code.length,
      language: input.runCodeOpts?.language,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Run code completed', {
      toolCallId,
      toolName,
      executionLength: output.execution.length,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);

      const execution = await sandbox.runCode(inputData.code, inputData.runCodeOpts);

      return {
        execution: JSON.stringify(execution.toJSON()),
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const readFile = createTool({
  id: 'readFile',
  description: 'Read a file from the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to read the file from'),
    path: z.string().describe('The path to the file to read'),
  }),
  outputSchema: z.object({
    content: z.string().describe('The content of the file'),
    path: z.string().describe('The path of the file that was read'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Read file tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Read file received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Read file completed', {
      toolCallId,
      toolName,
      contentLength: output.content.length,
      path: output.path,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      const fileContent = await sandbox.files.read(inputData.path);

      return {
        content: fileContent,
        path: inputData.path,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const writeFile = createTool({
  id: 'writeFile',
  description: 'Write a single file to the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to write the file to'),
    path: z.string().describe('The path where the file should be written'),
    content: z.string().describe('The content to write to the file'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the file was written successfully'),
    path: z.string().describe('The path where the file was written'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Write file tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Write file received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      contentLength: input.content.length,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Write file completed', {
      toolCallId,
      toolName,
      success: output.success,
      path: output.path,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      await sandbox.files.write(inputData.path, inputData.content);

      return {
        success: true,
        path: inputData.path,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const writeFiles = createTool({
  id: 'writeFiles',
  description: 'Write multiple files to the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to write the files to'),
    files: z
      .array(
        z.object({
          path: z.string().describe('The path where the file should be written'),
          data: z.string().describe('The content to write to the file'),
        }),
      )
      .describe('Array of files to write, each with path and data'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether all files were written successfully'),
    filesWritten: z.array(z.string()).describe('Array of file paths that were written'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Write files tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Write files received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      fileCount: input.files.length,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Write files completed', {
      toolCallId,
      toolName,
      success: output.success,
      filesWrittenCount: output.filesWritten.length,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      await sandbox.files.write(inputData.files);

      return {
        success: true,
        filesWritten: inputData.files.map(file => file.path),
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const listFiles = createTool({
  id: 'listFiles',
  description: 'List files and directories in a path within the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to list files from'),
    path: z.string().default('/').describe('The directory path to list files from'),
  }),
  outputSchema: z.object({
    files: z
      .array(
        z.object({
          name: z.string().describe('The name of the file or directory'),
          path: z.string().describe('The full path of the file or directory'),
          isDirectory: z.boolean().describe('Whether this is a directory'),
        }),
      )
      .describe('Array of files and directories'),
    path: z.string().describe('The path that was listed'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('List files tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('List files received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('List files completed', {
      toolCallId,
      toolName,
      fileCount: output.files.length,
      path: output.path,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      const fileList = await sandbox.files.list(inputData.path);

      return {
        files: fileList.map(file => ({
          name: file.name,
          path: file.path,
          isDirectory: file.type === FileType.DIR,
        })),
        path: inputData.path,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const deleteFile = createTool({
  id: 'deleteFile',
  description: 'Delete a file or directory from the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to delete the file from'),
    path: z.string().describe('The path to the file or directory to delete'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the file was deleted successfully'),
    path: z.string().describe('The path that was deleted'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Delete file tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Delete file received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Delete file completed', {
      toolCallId,
      toolName,
      success: output.success,
      path: output.path,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      await sandbox.files.remove(inputData.path);

      return {
        success: true,
        path: inputData.path,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  }
});

export const createDirectory = createTool({
  id: 'createDirectory',
  description: 'Create a directory in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to create the directory in'),
    path: z.string().describe('The path where the directory should be created'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the directory was created successfully'),
    path: z.string().describe('The path where the directory was created'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Create directory tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Create directory received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Create directory completed', {
      toolCallId,
      toolName,
      success: output.success,
      path: output.path,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      await sandbox.files.makeDir(inputData.path);

      return {
        success: true,
        path: inputData.path,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  }
});

export const getFileInfo = createTool({
  id: 'getFileInfo',
  description: 'Get detailed information about a file or directory in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to get file information from'),
    path: z.string().describe('The path to the file or directory to get information about'),
  }),
  outputSchema: z.object({
    name: z.string().describe('The name of the file or directory'),
    type: z.enum(FileType).optional().describe('Whether this is a file or directory'),
    path: z.string().describe('The full path of the file or directory'),
    size: z.number().describe('The size of the file or directory in bytes'),
    mode: z.number().describe('The file mode (permissions as octal number)'),
    permissions: z.string().describe('Human-readable permissions string'),
    owner: z.string().describe('The owner of the file or directory'),
    group: z.string().describe('The group of the file or directory'),
    modifiedTime: z.date().optional().describe('The last modified time in ISO string format'),
    symlinkTarget: z.string().optional().describe('The target path if this is a symlink, null otherwise'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Get file info tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Get file info received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Get file info completed', {
      toolCallId,
      toolName,
      name: output.name,
      size: output.size,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      const info = await sandbox.files.getInfo(inputData.path);

      return {
        name: info.name,
        type: info.type,
        path: info.path,
        size: info.size,
        mode: info.mode,
        permissions: info.permissions,
        owner: info.owner,
        group: info.group,
        modifiedTime: info.modifiedTime,
        symlinkTarget: info.symlinkTarget,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const checkFileExists = createTool({
  id: 'checkFileExists',
  description: 'Check if a file or directory exists in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to check file existence in'),
    path: z.string().describe('The path to check for existence'),
  }),
  outputSchema: z
    .object({
      exists: z.boolean().describe('Whether the file or directory exists'),
      path: z.string().describe('The path that was checked'),
      type: z.enum(FileType).optional().describe('The type if the path exists'),
    })
    .or(
      z.object({
        error: z.string().describe('The error from a failed existence check'),
      }),
    ),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Check file exists tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Check file exists received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Check file exists completed', {
      toolCallId,
      toolName,
      exists: 'exists' in output ? output.exists : false,
      path: 'path' in output ? output.path : '',
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);

      try {
        const info = await sandbox.files.getInfo(inputData.path);
        return {
          exists: true,
          path: inputData.path,
          type: info.type,
        };
      } catch {
        // If getInfo fails, the file doesn't exist
        return {
          exists: false,
          path: inputData.path,
        };
      }
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const getFileSize = createTool({
  id: 'getFileSize',
  description: 'Get the size of a file or directory in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to get file size from'),
    path: z.string().describe('The path to the file or directory'),
    humanReadable: z
      .boolean()
      .default(false)
      .describe("Whether to return size in human-readable format (e.g., '1.5 KB', '2.3 MB')"),
  }),
  outputSchema: z
    .object({
      size: z.number().describe('The size in bytes'),
      humanReadableSize: z.string().optional().describe('Human-readable size string if requested'),
      path: z.string().describe('The path that was checked'),
      type: z.enum(FileType).optional().describe('Whether this is a file or directory'),
    })
    .or(
      z.object({
        error: z.string().describe('The error from a failed size check'),
      }),
    ),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Get file size tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Get file size received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      humanReadable: input.humanReadable,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Get file size completed', {
      toolCallId,
      toolName,
      size: 'size' in output ? output.size : 0,
      path: 'path' in output ? output.path : '',
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      const info = await sandbox.files.getInfo(inputData.path);

      let humanReadableSize: string | undefined;

      if (inputData.humanReadable) {
        const bytes = info.size;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) {
          humanReadableSize = '0 B';
        } else {
          const i = Math.floor(Math.log(bytes) / Math.log(1024));
          const size = (bytes / Math.pow(1024, i)).toFixed(1);
          humanReadableSize = `${size} ${sizes[i]}`;
        }
      }

      return {
        size: info.size,
        humanReadableSize,
        path: inputData.path,
        type: info.type,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});

export const watchDirectory = createTool({
  id: 'watchDirectory',
  description: 'Start watching a directory for file system changes in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to watch directory in'),
    path: z.string().describe('The directory path to watch for changes'),
    recursive: z.boolean().default(false).describe('Whether to watch subdirectories recursively'),
    watchDuration: z
      .number()
      .default(30000)
      .describe('How long to watch for changes in milliseconds (default 30 seconds)'),
  }),
  outputSchema: z
    .object({
      watchStarted: z.boolean().describe('Whether the watch was started successfully'),
      path: z.string().describe('The path that was watched'),
      events: z
        .array(
          z.object({
            type: z
              .enum(FilesystemEventType)
              .describe('The type of filesystem event (WRITE, CREATE, DELETE, etc.)'),
            name: z.string().describe('The name of the file that changed'),
            timestamp: z.string().describe('When the event occurred'),
          }),
        )
        .describe('Array of filesystem events that occurred during the watch period'),
    })
    .or(
      z.object({
        error: z.string().describe('The error from a failed directory watch'),
      }),
    ),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Watch directory tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Watch directory received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      path: input.path,
      recursive: input.recursive,
      watchDuration: input.watchDuration,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Watch directory completed', {
      toolCallId,
      toolName,
      watchStarted: 'watchStarted' in output ? output.watchStarted : false,
      eventCount: 'events' in output ? output.events.length : 0,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);
      const events: Array<{ type: FilesystemEventType; name: string; timestamp: string }> = [];

      // Start watching the directory
      const handle = await sandbox.files.watchDir(
        inputData.path,
        async event => {
          events.push({
            type: event.type,
            name: event.name,
            timestamp: new Date().toISOString(),
          });
        },
        {
          recursive: inputData.recursive,
        },
      );

      // Watch for the specified duration
      await new Promise(resolve => setTimeout(resolve, inputData.watchDuration));

      // Stop watching
      await handle.stop();

      return {
        watchStarted: true,
        path: inputData.path,
        events,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  }
});

export const runCommand = createTool({
  id: 'runCommand',
  description: 'Run a shell command in the e2b sandbox',
  inputSchema: z.object({
    sandboxId: z.string().describe('The sandboxId for the sandbox to run the command in'),
    command: z.string().describe('The shell command to execute'),
    workingDirectory: z.string().optional().describe('The working directory to run the command in'),
    timeoutMs: z.number().default(30000).describe('Timeout for the command execution in milliseconds'),
    captureOutput: z.boolean().default(true).describe('Whether to capture stdout and stderr output'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the command executed successfully'),
    exitCode: z.number().describe('The exit code of the command'),
    stdout: z.string().describe('The standard output from the command'),
    stderr: z.string().describe('The standard error from the command'),
    command: z.string().describe('The command that was executed'),
    executionTime: z.number().describe('How long the command took to execute in milliseconds'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Run command tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Run command received complete input', {
      toolCallId,
      sandboxId: input.sandboxId,
      command: input.command,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Run command completed', {
      toolCallId,
      toolName,
      success: output.success,
      exitCode: output.exitCode,
      executionTime: output.executionTime,
      hook: 'onOutput',
    })
  },
  execute: async (inputData) => {
    const startTime = Date.now();
    try {
      const sandbox = await Sandbox.connect(inputData.sandboxId);

      const result = await sandbox.commands.run(inputData.command, {
        cwd: inputData.workingDirectory,
        timeoutMs: inputData.timeoutMs,
      });

      const executionTime = Date.now() - startTime;

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        command: inputData.command,
        executionTime,
      };
    } catch (e) {
      const errObj = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
      throw new Error(JSON.stringify(errObj));
    }
  },
});
