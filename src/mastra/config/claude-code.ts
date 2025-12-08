import { createClaudeCode } from 'ai-sdk-provider-claude-code'
import { logError } from './logger'

// Claude Code provider instance (uses Claude Code CLI authentication)
const claudeCodeProvider = createClaudeCode({
    defaultSettings: {
    pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_CLI_PATH ?? 'claude',
    permissionMode: 'bypassPermissions',
    maxTurns: 20,
    continue: true,
    maxThinkingTokens: 1000,
    additionalDirectories: [],
    cwd: process.env.CLAUDE_CODE_CLI_CWD ?? 'claude',
    mcpServers: {
    },
  }
})

// Claude Code Models
export const claudeCodeChatModels = {
  // Claude 4.1 Opus (most capable)
  claudeOpus: claudeCodeProvider('opus'),
  // Claude 4.5 Sonnet (balanced performance)
  claudeSonnet: claudeCodeProvider('sonnet'),
  // Claude 4.5 Haiku (fastest, most cost-effective)
  claudeHaiku: claudeCodeProvider('haiku'),
};

// Model selector function
export function getClaudeCodeChatModel(modelId: keyof typeof claudeCodeChatModels) {
  return claudeCodeChatModels[modelId];
}

// Backward compatibility exports
export const claudeCodeOpus = claudeCodeChatModels.claudeOpus;
export const claudeCodeSonnet = claudeCodeChatModels.claudeSonnet;
export const claudeCodeHaiku = claudeCodeChatModels.claudeHaiku;

export default claudeCodeProvider;
