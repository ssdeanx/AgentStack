import { createACPProvider } from '@mcpc-tech/acp-ai-provider';


const gemini = createACPProvider({
  command: 'gemini',
  args: ['--experimental-acp'],
  session: {
    cwd: process.cwd(),
    mcpServers: [],
  },
});

const claude = createACPProvider({
  command: 'claude-code-acp',
  session: {
    cwd: process.cwd(),
    mcpServers: [],
  },
});

const opencode = createACPProvider({
  command: 'opencode',
  session: {
    cwd: process.cwd(),
    mcpServers: [],
  },
});

const stackpak = createACPProvider({
  command: 'opencode',
  session: {
    cwd: process.cwd(),
    mcpServers: [],
  },
});

const geminiCLI = gemini.languageModel()

const claudeLM = claude.languageModel()

const opencodeLM = opencode.languageModel()