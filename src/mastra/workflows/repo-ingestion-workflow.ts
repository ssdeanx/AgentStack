import type { RequestContext } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { z, ZodError } from 'zod';
import { log } from '../config/logger';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { getFileContent, getRepoFileTree } from '../tools/github';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface IngestionRuntimeContext {
  'user-tier': UserTier;
}

// --- Schemas ---

const scanInputSchema = z.object({
  repoPath: z.string().optional().describe('Local repository path'),
  githubRepo: z.string().optional().describe('GitHub repository (owner/repo)'),
  githubBranch: z.string().default('main').describe('GitHub branch'),
  globPattern: z.string().default('**/*.{ts,tsx,js,jsx,py,md,json}'),
  limit: z.number().default(100),
}).refine(data => data.repoPath ?? data.githubRepo, {
  message: "Either repoPath or githubRepo must be provided"
});

const scanOutputSchema = z.object({
  files: z.array(z.string()),
  repoPath: z.string().optional(),
  githubRepo: z.string().optional(),
  githubBranch: z.string().optional(),
});

const ingestInputSchema = scanOutputSchema;

const ingestOutputSchema = z.object({
  processedFiles: z.number(),
  totalChunks: z.number(),
  errors: z.array(z.object({ file: z.string(), error: z.string() })),
});

// --- Steps ---

const scanStep = createStep({
  id: 'scan-repo',
  inputSchema: scanInputSchema,
  outputSchema: scanOutputSchema,
  execute: async ({ inputData, mastra, requestContext, writer }) => {
    const { repoPath, githubRepo, githubBranch, globPattern } = inputData;
    let { limit } = inputData;

    const githubRepoValue = typeof githubRepo === 'string' ? githubRepo : '';
    const repoPathValue = typeof repoPath === 'string' ? repoPath : '';

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Scanning repo (source: ${githubRepoValue.length > 0 ? `github:${githubRepoValue}@${githubBranch}` : `local:${repoPathValue.length > 0 ? repoPathValue : 'unknown'}`}, limit: ${limit}, pattern: ${globPattern})...`,
        stage: 'scan-repo',
      },
      id: 'scan-repo',
    });

    // Apply runtime context limits
    const context = requestContext as RequestContext<IngestionRuntimeContext> | undefined;
    const userTier = context?.get?.('user-tier') ?? 'free';

    const TIER_LIMITS: Record<UserTier, number> = {
      free: 50,
      pro: 500,
      enterprise: 10000
    };

    if (limit > TIER_LIMITS[userTier]) {
      log.info(`Limiting file scan to ${TIER_LIMITS[userTier]} for ${userTier} tier`);
      limit = TIER_LIMITS[userTier];
    }

    if (githubRepoValue.length > 0) {
      log.info(`Scanning GitHub repo ${githubRepoValue} branch ${githubBranch}`);
      const [owner, repo] = githubRepoValue.split('/');

      interface GitTreeItem {
        path: string;
        mode?: string;
        type: string;
        sha?: string;
        size?: number;
        url?: string;
      }

      const scanResultRaw = await getRepoFileTree.execute(
        { owner, repo, branch: githubBranch, recursive: true },
        { mastra, requestContext }
      );

      // Type guard to narrow to the success shape
      const isScanSuccess = (r: unknown): r is { success: boolean; tree?: GitTreeItem[]; error?: string } =>
        r !== null && typeof r === 'object' && 'success' in r;

      if (!isScanSuccess(scanResultRaw) || !scanResultRaw.success || !scanResultRaw.tree) {
        const errorMessage = isScanSuccess(scanResultRaw) ? (scanResultRaw.error ?? 'unknown error') : 'unknown error';
        throw new Error(`Failed to scan GitHub repo: ${errorMessage}`);
      }

      // At this point, scanResultRaw.tree is present
      const tree = scanResultRaw.tree as GitTreeItem[];

      // Simple filtering based on extensions for now since we don't have minimatch handy
      // Convert glob pattern like **/*.{ts,tsx} to regex or just check extensions
      // This is a simplified implementation
      const extensions =
        (/\{([^}]+)\}/.exec(globPattern || '')?.[1]?.split(',').map(s => s.trim())) ??
        ['ts', 'tsx', 'js', 'jsx', 'py', 'md', 'json'];

      const files = tree
        .filter((item: GitTreeItem) => item.type === 'blob' && extensions.some(ext => item.path.endsWith(`.${ext}`)))
        .map((item: GitTreeItem) => item.path)
        .slice(0, limit);

      log.info(`Found ${tree.length} files in GitHub, processing ${files.length}`);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Repo scan complete for GitHub repo ${githubRepoValue}@${githubBranch} (files: ${files.length})`,
          stage: 'scan-repo',
        },
        id: 'scan-repo',
      });

      return { files, githubRepo: githubRepoValue, githubBranch };
    }

    if (repoPathValue.length > 0) {
      log.info(`Scanning local repo at ${repoPathValue} with pattern ${globPattern}`);
      const files = await glob(globPattern, {
        cwd: repoPathValue,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        nodir: true,
        absolute: true
      });

      const limitedFiles = files.slice(0, limit);
      log.info(`Found ${files.length} files, processing ${limitedFiles.length}`);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Repo scan complete for local path ${repoPathValue} (files: ${limitedFiles.length})`,
          stage: 'scan-repo',
        },
        id: 'scan-repo',
      });

      return { files: limitedFiles, repoPath: repoPathValue };
    }

    const error = new Error('No repo path provided');
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Repo scan failed: ${error.message}`,
        stage: 'scan-repo',
      },
      id: 'scan-repo',
    });
    throw error;
  },
});

const ingestStep = createStep({
  id: 'ingest-files',
  inputSchema: ingestInputSchema,
  outputSchema: ingestOutputSchema,
  execute: async ({ inputData, writer, requestContext, mastra }) => {
    const { files, repoPath, githubRepo, githubBranch } = inputData;
    let processedFiles = 0;
    let totalChunks = 0;
    const errors: Array<{ file: string, error: string }> = [];

    const githubRepoValue = typeof githubRepo === 'string' ? githubRepo : '';
    const repoPathValue = typeof repoPath === 'string' ? repoPath : '';

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Starting ingestion (source: ${githubRepoValue.length > 0 ? `github:${githubRepoValue}@${githubBranch}` : `local:${repoPathValue.length > 0 ? repoPathValue : 'unknown'}`}, files: ${files.length})...`,
        stage: 'ingest-files',
      },
      id: 'ingest-files',
    });

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 10;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: `Ingesting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)} (batch size: ${batch.length})...`,
          stage: 'ingest-files',
        },
        id: 'ingest-files',
      });

      await Promise.all(batch.map(async (filePath) => {
        try {
          let content = '';

          if (githubRepoValue.length > 0) {
            const [owner, repo] = githubRepoValue.split('/');
            const result = await getFileContent.execute(
              { owner, repo, path: filePath, ref: githubBranch },
              { mastra, requestContext }
            );

            if (result instanceof ZodError) {
              throw new Error(`Validation error fetching file: ${result.message}`);
            }

            const successResult = result as { success: boolean; content?: string; encoding?: string; sha?: string; size?: number; error?: string };
            if (!successResult.success || successResult.content === null || successResult.content === undefined || successResult.content === '') {
              throw new Error(`Failed to fetch file from GitHub: ${successResult.error}`);
            }
            content = successResult.content;
          } else if (repoPathValue.length > 0) {
            content = await readFile(filePath, 'utf-8');
          }

          const ext = path.extname(filePath).toLowerCase();

          let strategy: 'recursive' | 'markdown' | 'json' = 'recursive';
          if (ext === '.md') { strategy = 'markdown'; }
          if (ext === '.json') { strategy = 'json'; }

          const result = await mdocumentChunker.execute({
            documentContent: content,
            documentMetadata: { filePath, source: (githubRepoValue.length > 0) ? 'github' : 'local' },
            chunkingStrategy: strategy,
            indexName: 'memory_messages_3072',
            generateEmbeddings: true,
            embeddingModel: 'google/gemini-embedding-001',
            embeddingBatchSize: 50,
            chunkSize: 512,
            chunkOverlap: 50,
            chunkSeparator: '\n'
          }, { writer, requestContext });

          const isSuccessResult = (r: unknown): r is { success: true; chunkCount?: number } =>
            typeof r === 'object' && r !== null && 'success' in r && (r as { success: unknown }).success === true;

          const isErrorObject = (r: unknown): r is { error: unknown } =>
            typeof r === 'object' && r !== null && 'error' in r;

          if (isSuccessResult(result)) {
            processedFiles++;
            totalChunks += result.chunkCount ?? 0;
          } else if (result instanceof ZodError) {
            throw new Error(result.message);
          } else if (result instanceof Error) {
            throw result;
          } else if (isErrorObject(result)) {
            const err = result.error;
            throw new Error(typeof err === 'string' ? err : 'Unknown error in chunking');
          } else {
            throw new Error('Unknown error in chunking');
          }

        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          log.error(`Error processing ${filePath}:`, { error: errorObj });
          errors.push({
            file: filePath,
            error: errorObj.message
          });
        }
      }));
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Ingestion complete (processed: ${processedFiles}/${files.length}, chunks: ${totalChunks}, errors: ${errors.length})`,
        stage: 'ingest-files',
      },
      id: 'ingest-files',
    });

    return { processedFiles, totalChunks, errors };
  },
});

// --- Workflow ---

export const repoIngestionWorkflow = createWorkflow({
  id: 'repoIngestionWorkflow',
  inputSchema: scanInputSchema,
  outputSchema: ingestOutputSchema,
})
  .then(scanStep)
  .then(ingestStep)
  .commit();
