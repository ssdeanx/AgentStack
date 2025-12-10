import { createACPProvider } from '@mcpc-tech/acp-ai-provider';


export const geminiACP = createACPProvider({
  command: 'gemini',
  args: ['--experimental-acp'],
  authMethodId: 'gemini-api-key',
  env: {
    GEMINI_API_KEY: process.env.GOOGLE_API_KEY!,
    DEBUG: 'true',
  },
  session: {
    cwd: process.cwd(),
    mcpServers: []
  },
});
