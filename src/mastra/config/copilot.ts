import { createGitHubCopilotOpenAICompatible } from '@opeoginni/github-copilot-openai-compatible';

const githubCopilot = createGitHubCopilotOpenAICompatible({
  baseURL: 'https://api.githubcopilot.com',
  name: 'githubcopilot',
  apiKey: process.env.COPILOT_TOKEN,
  headers: {
    Authorization: `Bearer ${process.env.COPILOT_TOKEN}`,
    "Copilot-Integration-Id": "vscode-chat", // These configs must be provided
    "User-Agent": "GitHubCopilotChat/0.26.7",
    "Editor-Version": "vscode/1.104.1",
    "Editor-Plugin-Version": "copilot-chat/0.26.7"
  },
});

// This will automatically use the /responses endpoint with 'item' format
export const gptAI = githubCopilot.chatModel('gpt-5-mini');
// And this will use the /completions endpoint only codex models must use this aka languageModel
export const gptCodex = githubCopilot.languageModel('gpt-5.1-codex-mini');
// xAI chat model example from GitHub Copilot cost: 0 credits
export const grokAI = githubCopilot.chatModel('grok-code-fast-1');

// beta chat model example from GitHub Copilot cost: 0 credits
export const raptorAI = githubCopilot.chatModel('oswe-vscode-prime@raptor-mini');


export { githubCopilot };