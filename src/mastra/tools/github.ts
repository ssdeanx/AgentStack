import { trace, SpanStatusCode } from "@opentelemetry/api";
import { Octokit } from "octokit";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { log } from '../config/logger';

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  updated_at: string;
}

function getOctokit() {
  const token = process.env.GITHUB_API_KEY ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  return new Octokit({ auth: token });
}

// Helper to normalize or map repository items into our shape
function mapRepo(repo: GitHubRepo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    isPrivate: repo.private,
    updatedAt: repo.updated_at,
  };
}

// Map input 'type' (combined set) to org-specific types accepted by listForOrg
function mapTypeForOrg(type?: string): 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member' | undefined {
  if (type === undefined || type === null || type === '') { return undefined; }
  switch (type) {
    case 'all':
    case 'public':
    case 'private':
    case 'forks':
    case 'sources':
    case 'member':
      return type as any;
    default:
      return undefined;
  }
}

// Map input 'type' to authenticated user types accepted by listForAuthenticatedUser
function mapTypeForAuthenticatedUser(type?: string): 'all' | 'owner' | 'public' | 'private' | 'member' | undefined {
  if (type === undefined || type === null || type === '') { return undefined; }
  switch (type) {
    case 'all':
    case 'owner':
    case 'public':
    case 'private':
    case 'member':
      return type;
    default:
      return undefined;
  }
}


export const listRepositories = createTool({
  id: 'github:listRepositories',
  description: 'List repositories for the authenticated user or a specified organization',
  inputSchema: z.object({
    org: z.string().optional().describe('Organization name (optional, defaults to user repos)'),
    type: z.enum(['all', 'public', 'private', 'member', 'owner', 'forks', 'sources']).optional().default('all'),
    sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().default('updated'),
    perPage: z.number().optional().default(30),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    repositories: z.array(z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      defaultBranch: z.string(),
      stars: z.number(),
      forks: z.number(),
      isPrivate: z.boolean(),
      updatedAt: z.string(),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-list-repos', {
      attributes: {
        'tool.id': 'github:listRepositories',
        'tool.input.org': inputData.org,
        'tool.input.type': inputData.type,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: '📚 Fetching repositories...' } });

    try {
      const octokit = getOctokit();
      let response;
      if (inputData.org !== undefined) {
        response = await octokit.rest.repos.listForOrg({
          org: inputData.org,
          type: mapTypeForOrg(inputData.type),
          sort: inputData.sort,
          per_page: inputData.perPage,
        });
      } else {
        response = await octokit.rest.repos.listForAuthenticatedUser({
          type: mapTypeForAuthenticatedUser(inputData.type),
          sort: inputData.sort,
          per_page: inputData.perPage,
        });
      }
      const data = response.data as any[];

      const repositories = data.map(mapRepo);

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${repositories.length} repositories` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.count': repositories.length,
      });
      span.end();

      return { success: true, repositories };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub list repos failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

interface GitHubPR {
  number: number;
  title: string;
  state: string;
  user: { login: string } | null | undefined;
  html_url: string;
  created_at: string;
  updated_at: string;
  draft?: boolean;
  labels: Array<{ name: string }>;
}

export const listPullRequests = createTool({
  id: 'github:listPullRequests',
  description: 'List pull requests for a repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().default('updated'),
    direction: z.enum(['asc', 'desc']).optional().default('desc'),
    perPage: z.number().optional().default(30),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    pullRequests: z.array(z.object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
      author: z.string(),
      url: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      draft: z.boolean(),
      labels: z.array(z.string()),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-list-prs', {
      attributes: {
        'tool.id': 'github:listPullRequests',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `📋 Fetching PRs for ${inputData.owner}/${inputData.repo}...` } });

    try {
      const octokit = getOctokit();
      const response = await octokit.rest.pulls.list({
        owner: inputData.owner,
        repo: inputData.repo,
        state: inputData.state,
        sort: inputData.sort,
        direction: inputData.direction,
        per_page: inputData.perPage,
      });

      const pullRequests = (response.data ?? []).map((pr: GitHubPR) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login ?? 'unknown',
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        draft: pr.draft ?? false,
        labels: pr.labels.map(l => l.name),
      }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${pullRequests.length} pull requests` } });

      span.setAttributes({ 'tool.output.success': true, 'tool.output.count': pullRequests.length });
      span.end();

      return { success: true, pullRequests };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub list PRs failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const listIssues = createTool({
  id: 'github:listIssues',
  description: 'List issues for a repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    labels: z.string().optional().describe('Comma-separated list of labels'),
    sort: z.enum(['created', 'updated', 'comments']).optional().default('updated'),
    direction: z.enum(['asc', 'desc']).optional().default('desc'),
    perPage: z.number().optional().default(30),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    issues: z.array(z.object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
      author: z.string(),
      url: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      labels: z.array(z.string()),
      comments: z.number(),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-list-issues', {
      attributes: {
        'tool.id': 'github:listIssues',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `🐛 Fetching issues for ${inputData.owner}/${inputData.repo}...` } });

    try {
      const octokit = getOctokit();
      const response = await octokit.rest.issues.listForRepo({
        owner: inputData.owner,
        repo: inputData.repo,
        state: inputData.state,
        labels: inputData.labels,
        sort: inputData.sort,
        direction: inputData.direction,
        per_page: inputData.perPage,
      });

      const data = response.data as any[];
      const issues = data
        .filter((issue) => issue.pull_request === undefined || issue.pull_request === null)
        .map((issue) => ({
          number: issue.number as number,
          title: issue.title as string,
          state: issue.state as string,
          author: (issue.user as Record<string, unknown>)?.login as string ?? 'unknown',
          url: issue.html_url as string,
          createdAt: issue.created_at as string,
          updatedAt: issue.updated_at as string,
          labels: ((issue.labels as Array<Record<string, unknown>>) ?? []).map((l) => l.name as string),
          comments: issue.comments as number,
        }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${issues.length} issues` } });

      span.setAttributes({ 'tool.output.success': true, 'tool.output.count': issues.length });
      span.end();

      return { success: true, issues };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub list issues failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const createIssue = createTool({
  id: 'github:createIssue',
  description: 'Create a new issue in a repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().optional().describe('Issue body/description'),
    labels: z.array(z.string()).optional().describe('Labels to add'),
    assignees: z.array(z.string()).optional().describe('Usernames to assign'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    issue: z.object({
      number: z.number(),
      url: z.string(),
      title: z.string(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-create-issue', {
      attributes: {
        'tool.id': 'github:createIssue',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
        'tool.input.title': inputData.title,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `📝 Creating issue in ${inputData.owner}/${inputData.repo}...` } });

    try {
      const octokit = getOctokit();
      const response = await octokit.rest.issues.create({
        owner: inputData.owner,
        repo: inputData.repo,
        title: inputData.title,
        body: inputData.body,
        labels: inputData.labels,
        assignees: inputData.assignees,
      });
      const data = response.data as any;

      const issue = {
        number: data.number as number,
        url: data.html_url as string,
        title: data.title as string,
      };

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Created issue #${issue.number}` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.issueNumber': issue.number
      });
      span.end();

      return { success: true, issue };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub create issue failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const getRepositoryInfo = createTool({
  id: 'github:getRepositoryInfo',
  description: 'Get detailed information about a repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    repository: z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      defaultBranch: z.string(),
      stars: z.number(),
      forks: z.number(),
      watchers: z.number(),
      openIssues: z.number(),
      isPrivate: z.boolean(),
      language: z.string().nullable(),
      topics: z.array(z.string()),
      createdAt: z.string(),
      updatedAt: z.string(),
      pushedAt: z.string(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-get-repo-info', {
      attributes: {
        'tool.id': 'github:getRepositoryInfo',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `📊 Fetching repository info for ${inputData.owner}/${inputData.repo}...` } });

    try {
      const octokit = getOctokit();
      const res = await octokit.rest.repos.get({ owner: inputData.owner, repo: inputData.repo });
      const repo = res.data as any;

      const repository = {
        name: repo.name as string,
        fullName: repo.full_name as string,
        description: (repo.description as string) ?? null,
        url: repo.html_url as string,
        defaultBranch: repo.default_branch as string,
        stars: repo.stargazers_count as number,
        forks: repo.forks_count as number,
        watchers: repo.watchers_count as number,
        openIssues: repo.open_issues_count as number,
        isPrivate: repo.private as boolean,
        language: (repo.language as string) ?? null,
        topics: (repo.topics as string[]) ?? [],
        createdAt: repo.created_at as string,
        updatedAt: repo.updated_at as string,
        pushedAt: repo.pushed_at as string,
      };

      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Repository info retrieved' } });

      span.setAttributes({
        'tool.output.success': true
      });
      span.end();

      return { success: true, repository };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub get repo info failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const searchCode = createTool({
  id: 'github:searchCode',
  description: 'Search for code across GitHub repositories',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    repo: z.string().optional().describe('Limit search to specific repo (owner/repo format)'),
    language: z.string().optional().describe('Filter by programming language'),
    perPage: z.number().optional().default(30),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      name: z.string(),
      path: z.string(),
      repository: z.string(),
      url: z.string(),
      sha: z.string(),
    })).optional(),
    totalCount: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-search-code', {
      attributes: {
        'tool.id': 'github:searchCode',
        'tool.input.query': inputData.query,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `🔍 Searching code for "${inputData.query}"...` } });

    try {
      const octokit = getOctokit();
      let q = inputData.query;
      if (inputData.repo !== undefined && inputData.repo !== null && inputData.repo !== '') { q += ` repo:${inputData.repo}`; }
      if (inputData.language !== undefined && inputData.language !== null && inputData.language !== '') { q += ` language:${inputData.language}`; }

      const data = await octokit.rest.search.code({ q, per_page: inputData.perPage });
      const items = data.data.items as any[];

      const results = items.map((item) => ({
        name: item.name as string,
        path: item.path as string,
        repository: (item.repository as Record<string, unknown>)?.full_name as string ?? 'unknown',
        url: item.html_url as string,
        sha: item.sha as string,
      }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${data.data.total_count} results` } });

      span.setAttributes({ 'tool.output.success': true, 'tool.output.totalCount': data.data.total_count });
      span.end();

      return { success: true, results, totalCount: data.data.total_count };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub search code failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const getFileContent = createTool({
  id: 'github:getFileContent',
  description: 'Get the content of a file from a repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('Path to the file'),
    ref: z.string().optional().describe('Branch, tag, or commit SHA (defaults to default branch)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional(),
    encoding: z.string().optional(),
    sha: z.string().optional(),
    size: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-get-file', {
      attributes: {
        'tool.id': 'github:getFileContent',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
        'tool.input.path': inputData.path,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `📄 Fetching file ${inputData.path}...` } });

    try {
      const octokit = getOctokit();
      const response = await octokit.rest.repos.getContent({ owner: inputData.owner, repo: inputData.repo, path: inputData.path, ref: inputData.ref });
      const data = response.data as any;

      if (Array.isArray(data)) {
        throw new Error('Path points to a directory, not a file');
      }

      const content = data.encoding === 'base64' ? Buffer.from(data.content as string, 'base64').toString('utf-8') : (data.content as string);

      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ File content retrieved' } });

      span.setAttributes({ 'tool.output.success': true, 'tool.output.size': data.size as number });
      span.end();

      return { success: true, content, encoding: data.encoding as string, sha: data.sha as string, size: data.size as number };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub get file failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export const getRepoFileTree = createTool({
  id: 'github:getRepoFileTree',
  description: 'Get the full file tree of a repository recursively',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    branch: z.string().optional().default('main').describe('Branch name'),
    recursive: z.boolean().optional().default(true).describe('Whether to fetch recursively'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tree: z.array(z.object({
      path: z.string(),
      mode: z.string(),
      type: z.string(),
      sha: z.string(),
      size: z.number().optional(),
      url: z.string().optional(),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('github-tool');
    const span = tracer.startSpan('github-get-tree', {
      attributes: {
        'tool.id': 'github:getRepoFileTree',
        'tool.input.owner': inputData.owner,
        'tool.input.repo': inputData.repo,
        'tool.input.branch': inputData.branch,
      }
    });

    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: `🌳 Fetching file tree for ${inputData.owner}/${inputData.repo}...` } });

    try {
      const octokit = getOctokit();
      // Get branch commit to find tree SHA
      const branchRes = await octokit.rest.repos.getBranch({ owner: inputData.owner, repo: inputData.repo, branch: inputData.branch });
      const treeSha = (branchRes.data as any).commit.commit.tree.sha as string;

      const treeRes = await octokit.rest.git.getTree({ owner: inputData.owner, repo: inputData.repo, tree_sha: treeSha, recursive: inputData.recursive ? '1' : '0' });
      const data = treeRes.data as any;

      const tree = (data.tree ?? []).map((item: any) => ({
        path: item.path as string,
        mode: item.mode as string,
        type: item.type as string,
        sha: item.sha as string,
        size: item.size as number | undefined,
        url: item.url as string | undefined,
      }));

      if (data.truncated === true) {
        await writer?.custom({ type: 'data-tool-progress', data: { message: '⚠️ Warning: File tree was truncated by GitHub API limit' } });
      }

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${tree.length} items` } });

      span.setAttributes({ 'tool.output.success': true, 'tool.output.count': tree.length });
      span.end();

      return { success: true, tree };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub get tree failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

export type GitHubListRepositoriesUITool = InferUITool<typeof listRepositories>;
export type GitHubListPullRequestsUITool = InferUITool<typeof listPullRequests>;
export type GitHubListIssuesUITool = InferUITool<typeof listIssues>;
export type GitHubCreateIssueUITool = InferUITool<typeof createIssue>;
export type GitHubGetRepositoryInfoUITool = InferUITool<typeof getRepositoryInfo>;
export type GitHubSearchCodeUITool = InferUITool<typeof searchCode>;
export type GitHubGetFileContentUITool = InferUITool<typeof getFileContent>;
export type GitHubGetRepoFileTreeUITool = InferUITool<typeof getRepoFileTree>;
