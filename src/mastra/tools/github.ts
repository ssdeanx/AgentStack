import { trace } from "@opentelemetry/api";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { GithubIntegration } from "@mastra/github";
import { z } from 'zod';
import { log } from '../config/logger';


export const github = new GithubIntegration({
  config: {
    PERSONAL_ACCESS_TOKEN: process.env.GITHUB_API_KEY ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
  }
});

const GITHUB_API_BASE = 'https://api.github.com';

async function githubFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = process.env.GITHUB_API_KEY ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': token ? `Bearer ${token}` : '',
      'User-Agent': 'Mastra-GitHub-Agent',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const listRepositories = createTool({
  id: 'github:listRepositories',
  description: 'List repositories for the authenticated user or a specified organization',
  inputSchema: z.object({
    org: z.string().optional().describe('Organization name (optional, defaults to user repos)'),
    type: z.enum(['all', 'public', 'private', 'forks', 'sources', 'member']).optional().default('all'),
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
      const path = inputData.org !== undefined
        ? `/orgs/${inputData.org}/repos?type=${inputData.type}&sort=${inputData.sort}&per_page=${inputData.perPage}`
        : `/user/repos?type=${inputData.type}&sort=${inputData.sort}&per_page=${inputData.perPage}`;

      const data = await githubFetch<Array<Record<string, unknown>>>(path);

      const repositories = data.map((repo) => ({
        name: repo.name as string,
        fullName: repo.full_name as string,
        description: repo.description as string | null,
        url: repo.html_url as string,
        defaultBranch: repo.default_branch as string,
        stars: repo.stargazers_count as number,
        forks: repo.forks_count as number,
        isPrivate: repo.private as boolean,
        updatedAt: repo.updated_at as string,
      }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${repositories.length} repositories` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.count': repositories.length
      });
      span.end();

      return { success: true, repositories };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub list repos failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();

      return { success: false, error: errorMsg };
    }
  },
});

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
      const path = `/repos/${inputData.owner}/${inputData.repo}/pulls?state=${inputData.state}&sort=${inputData.sort}&direction=${inputData.direction}&per_page=${inputData.perPage}`;
      const data = await githubFetch<Array<Record<string, unknown>>>(path);

      const pullRequests = data.map((pr) => ({
        number: pr.number as number,
        title: pr.title as string,
        state: pr.state as string,
        author: (pr.user as Record<string, unknown>)?.login as string ?? 'unknown',
        url: pr.html_url as string,
        createdAt: pr.created_at as string,
        updatedAt: pr.updated_at as string,
        draft: pr.draft as boolean ?? false,
        labels: ((pr.labels as Array<Record<string, unknown>>) ?? []).map((l) => l.name as string),
      }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${pullRequests.length} pull requests` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.count': pullRequests.length
      });
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
      let path = `/repos/${inputData.owner}/${inputData.repo}/issues?state=${inputData.state}&sort=${inputData.sort}&direction=${inputData.direction}&per_page=${inputData.perPage}`;
      if (inputData.labels !== undefined && inputData.labels !== null) {path += `&labels=${inputData.labels}`;}

      const data = await githubFetch<Array<Record<string, unknown>>>(path);

      // Filter out pull requests (GitHub API returns PRs as issues too)
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

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.count': issues.length
      });
      span.end();

      return { success: true, issues };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub list issues failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
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
      const data = await githubFetch<Record<string, unknown>>(`/repos/${inputData.owner}/${inputData.repo}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputData.title,
          body: inputData.body,
          labels: inputData.labels,
          assignees: inputData.assignees,
        }),
      });

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
      const repo = await githubFetch<Record<string, unknown>>(`/repos/${inputData.owner}/${inputData.repo}`);

      const repository = {
        name: repo.name as string,
        fullName: repo.full_name as string,
        description: repo.description as string | null,
        url: repo.html_url as string,
        defaultBranch: repo.default_branch as string,
        stars: repo.stargazers_count as number,
        forks: repo.forks_count as number,
        watchers: repo.watchers_count as number,
        openIssues: repo.open_issues_count as number,
        isPrivate: repo.private as boolean,
        language: repo.language as string | null,
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
      let q = inputData.query;
      if (inputData.repo) {q += ` repo:${inputData.repo}`;}
      if (inputData.language) {q += ` language:${inputData.language}`;}

      const data = await githubFetch<{ total_count: number; items: Array<Record<string, unknown>> }>(
        `/search/code?q=${encodeURIComponent(q)}&per_page=${inputData.perPage}`
      );

      const results = data.items.map((item) => ({
        name: item.name as string,
        path: item.path as string,
        repository: (item.repository as Record<string, unknown>)?.full_name as string ?? 'unknown',
        url: item.html_url as string,
        sha: item.sha as string,
      }));

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${data.total_count} results` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.totalCount': data.total_count
      });
      span.end();

      return { success: true, results, totalCount: data.total_count };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub search code failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
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
      let apiPath = `/repos/${inputData.owner}/${inputData.repo}/contents/${inputData.path}`;
      if (inputData.ref !== undefined && inputData.ref !== null) {apiPath += `?ref=${inputData.ref}`;}

      const data = await githubFetch<Record<string, unknown>>(apiPath);

      if (Array.isArray(data)) {
        throw new Error('Path points to a directory, not a file');
      }

      const content = data.encoding === 'base64'
        ? Buffer.from(data.content as string, 'base64').toString('utf-8')
        : data.content as string;

      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ File content retrieved' } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.size': data.size
      });
      span.end();

      return {
        success: true,
        content,
        encoding: data.encoding as string,
        sha: data.sha as string,
        size: data.size as number,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub get file failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
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
      // 1. Get the tree SHA for the branch
      // We can pass the branch name directly to the trees API in many cases, but let's be robust
      const treePath = `/repos/${inputData.owner}/${inputData.repo}/git/trees/${inputData.branch}?recursive=${inputData.recursive ? '1' : '0'}`;

      const data = await githubFetch<{ tree: Array<Record<string, unknown>>, truncated: boolean }>(treePath);

      const tree = data.tree.map((item) => ({
        path: item.path as string,
        mode: item.mode as string,
        type: item.type as string,
        sha: item.sha as string,
        size: item.size as number | undefined,
        url: item.url as string | undefined,
      }));

      if (data.truncated) {
        await writer?.custom({ type: 'data-tool-progress', data: { message: '⚠️ Warning: File tree was truncated by GitHub API limit' } });
      }

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Found ${tree.length} items` } });

      span.setAttributes({
        'tool.output.success': true,
        'tool.output.count': tree.length
      });
      span.end();

      return { success: true, tree };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`GitHub get tree failed: ${errorMsg}`);

      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
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
