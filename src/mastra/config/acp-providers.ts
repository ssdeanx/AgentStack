import { createACPProvider } from '@mcpc-tech/acp-ai-provider';


const gemini = createACPProvider({
  command: 'gemini',
  args: ['--experimental-acp'],
  env:  {
    'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY || '',
  },
  authMethodId: "apiKey",
  persistSession: true,
  session: { cwd: process.cwd(), mcpServers: [], },
});

const claude = createACPProvider({
  command: 'claude-code-acp',
  session: { cwd: process.cwd(), mcpServers: [], },
});

const opencode = createACPProvider({
  command: 'opencode',
  args: ['--acp'],
  session: { cwd: process.cwd(), mcpServers: [], },
});

const stackpak = createACPProvider({
  command: 'stackpak',
  session: {
    cwd: process.cwd(),
    mcpServers: [],
  },
});

const geminiLM = gemini.languageModel()

const claudeLM = claude.languageModel()

const opencodeLM = opencode.languageModel()
const stackpakLM = stackpak.languageModel()

export {
  geminiLM,
  claudeLM,
  opencodeLM,
  stackpakLM,
};