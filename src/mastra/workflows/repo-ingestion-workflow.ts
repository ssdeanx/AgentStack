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
  execute: async ({ inputData, mastra, requestContext }) => {
    const { repoPath, githubRepo, githubBranch, globPattern } = inputData;
    let { limit } = inputData;

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

    if (githubRepo) {
      log.info(`Scanning GitHub repo ${githubRepo} branch ${githubBranch}`);
      const [owner, repo] = githubRepo.split('/');

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
      const isScanSuccess = (r: any): r is { success: boolean; tree?: GitTreeItem[]; error?: string } =>
        (Boolean(r)) && typeof r === 'object' && 'success' in r;

      if (!isScanSuccess(scanResultRaw) || !scanResultRaw.success || !scanResultRaw.tree) {
        throw new Error(`Failed to scan GitHub repo: ${(scanResultRaw as any)?.error ?? 'unknown error'}`);
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
      return { files, githubRepo, githubBranch };
    }

    if (repoPath) {
      log.info(`Scanning local repo at ${repoPath} with pattern ${globPattern}`);
      const files = await glob(globPattern, {
        cwd: repoPath,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        nodir: true,
        absolute: true
      });

      const limitedFiles = files.slice(0, limit);
      log.info(`Found ${files.length} files, processing ${limitedFiles.length}`);
      return { files: limitedFiles, repoPath };
    }

    throw new Error("No repo path provided");
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

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 10;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (filePath) => {
        try {
          let content = '';

          if (githubRepo) {
            const [owner, repo] = githubRepo.split('/');
            const result = await getFileContent.execute(
              { owner, repo, path: filePath, ref: githubBranch },
              { mastra, requestContext }
            );

            if (result instanceof ZodError) {
              throw new Error(`Validation error fetching file: ${result.message}`);
            }

            const successResult = result as { success: boolean; content?: string; encoding?: string; sha?: string; size?: number; error?: string };
            if (!successResult.success || !successResult.content) {
              throw new Error(`Failed to fetch file from GitHub: ${successResult.error}`);
            }
            content = successResult.content;
          } else if (repoPath) {
            content = await readFile(filePath, 'utf-8');
          }

          const ext = path.extname(filePath).toLowerCase();

          let strategy: 'recursive' | 'markdown' | 'json' = 'recursive';
          if (ext === '.md') { strategy = 'markdown'; }
          if (ext === '.json') { strategy = 'json'; }

          const result = await mdocumentChunker.execute({
            documentContent: content,
            documentMetadata: { filePath, source: githubRepo ? 'github' : 'local' },
            chunkingStrategy: strategy,
            indexName: 'memory_messages_3072',
            generateEmbeddings: true,
            chunkSize: 512,
            chunkOverlap: 50,
            chunkSeparator: '\n'
          }, { writer, requestContext });

          if (result && typeof result === 'object' && 'success' in result && result.success) {
                      processedFiles++;
                      totalChunks += result.chunkCount;
                    }
          else if (result instanceof ZodError) {
                        throw new Error(result.message);
                      }
          else if (result instanceof Error) {
                        throw result;
                      } else if (result && typeof result === 'object' && 'error' in result) {
                        throw new Error(typeof result.error === 'string' ? result.error : 'Unknown error in chunking');
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
