import { createGitHubCopilotOpenAICompatible } from '@opeoginni/github-copilot-openai-compatible'
//import { logError } from './logger'
import * as dotenv from 'dotenv'
import { approveAll, CopilotClient } from "@github/copilot-sdk";

// Token is read from environment variable automatically
const client = new CopilotClient(
    {
        useStdio: true,
        isChildProcess: true,
        cliPath: process.env.COPILOT_CLI_PATH ?? '~/copilot-cli', // Optional: specify path to copilot-cli if not in PATH
    }
);

const session = await client.createSession({
    onPermissionRequest: approveAll,
    model: "gpt-5-mini",
    streaming: true,
    workingDirectory: process.cwd(),

});

// Load environment variables
dotenv.config()

// GitHub Copilot configuration from environment variables
export const githubCopilotConfig: {
    baseURL: string
    headers: Record<string, string>
    apiKey?: string
} = {
    baseURL: process.env.COPILOT_BASE_URL ?? 'https://api.githubcopilot.com',
    headers: {
        Authorization: `Bearer ${process.env.COPILOT_TOKEN ?? ''}`,
        'Copilot-Integration-Id':
            process.env.COPILOT_INTEGRATION_ID ?? 'vscode-chat',
        'User-Agent':
            process.env.COPILOT_USER_AGENT ?? 'GitHubCopilotChat/0.40.2026031802',
        'Editor-Version':
            process.env.COPILOT_EDITOR_VERSION ?? 'vscode/1.112.0-insider',
        'Editor-Plugin-Version':
            process.env.COPILOT_EDITOR_PLUGIN_VERSION ?? 'copilot-chat/0.40.2026031802',
    },
    apiKey: process.env.COPILOT_TOKEN,
}

// Create the GitHub Copilot provider with configuration
export const githubCopilotProvider = createGitHubCopilotOpenAICompatible({
    baseURL: githubCopilotConfig.baseURL,
    name: 'github-copilot',
    headers: githubCopilotConfig.headers,
    apiKey: githubCopilotConfig.apiKey,
})

// Export configured models
export const githubCopilotModels = {
    // Claude models
    claudeOpus4: githubCopilotProvider.chatModel('claude-opus-4'),
    claudeOpus41: githubCopilotProvider.chatModel('claude-opus-41'),
    claude35Sonnet: githubCopilotProvider.chatModel('claude-3.5-sonnet'),
    claude37Sonnet: githubCopilotProvider.chatModel('claude-3.7-sonnet'),
    claude37SonnetThought: githubCopilotProvider.chatModel(
        'claude-3.7-sonnet-thought'
    ),
    claudeSonnet4: githubCopilotProvider.chatModel('claude-sonnet-4'),
    claudeSonnet45: githubCopilotProvider.chatModel('claude-sonnet-4.5'),
    // Gemini models
    gemini20Flash001: githubCopilotProvider.chatModel('gemini-2.0-flash-001'),
    gemini25Pro: githubCopilotProvider.chatModel('gemini-2.5-pro'),
    // GPT models
    gpt4: githubCopilotProvider.chatModel('gpt-4'),
    gpt41: githubCopilotProvider.chatModel('gpt-4.1'),
    gpt4o: githubCopilotProvider.chatModel('gpt-4o'),
    gpt5: githubCopilotProvider.chatModel('gpt-5'),
    gpt5Codex: githubCopilotProvider.chatModel('gpt-5-codex'),
    gpt5Mini: githubCopilotProvider.chatModel('gpt-5-mini'),
    gpt51Codex: githubCopilotProvider.chatModel('gpt-5.1-codex'),
    gpt51CodexMini: githubCopilotProvider.chatModel('gpt-5.1-codex-mini'),
    gpt54: githubCopilotProvider.chatModel('gpt-5.4'),
    gpt54Mini: githubCopilotProvider.chatModel('gpt-5.4-mini'),
    
    gpt35Turbo: githubCopilotProvider.chatModel('gpt-3.5-turbo'),
    // Grok models
    grokCodeFast1: githubCopilotProvider.chatModel('grok-code-fast-1'),
    // OpenAI o-series models
    o3: githubCopilotProvider.chatModel('o3'),
    o3Mini: githubCopilotProvider.chatModel('o3-mini'),
    o4Mini: githubCopilotProvider.chatModel('o4-mini'),
}

// Model selector function
export function getGitHubCopilotModel(
    modelId: keyof typeof githubCopilotModels
) {
    return githubCopilotModels[modelId]
}

// Default model
export const githubCopilotModel = githubCopilotModels.gpt5
