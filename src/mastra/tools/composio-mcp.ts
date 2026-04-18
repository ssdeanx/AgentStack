import { MCPClient, MCPOAuthClientProvider } from '@mastra/mcp'
import { log } from '../config/logger'

const oauthProvider = new MCPOAuthClientProvider({
  redirectUrl: 'http://localhost:3000/oauth/callback',
  clientMetadata: {
    redirect_uris: ['http://localhost:3000/oauth/callback'],
    client_name: 'My MCP Client',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  },
  onRedirectToAuthorization: url => {
    // Handle authorization redirect (open browser, redirect response, etc.)
    log.info(`Please visit: ${url}`)
  },
})
const composioKey = process.env.COMPOSIO_API_KEY

const composioMcp = new MCPClient({
  servers: {
    composio: {
      url: new URL(`https://connect.composio.dev/mcp?apiKey=${composioKey}`),
    },
    //googleSheets: {
    //  url: new URL(`https://mcp.composio.dev/googlesheets/${composioKey}`),
    //},
    //gmail: {
    //  url: new URL(`https://mcp.composio.dev/gmail/${composioKey}`),
    //},
  },
})

// Access prompt methods via composioMcp.prompts
//const allPromptsByServer = await composioMcp.prompts.list()
//const { prompt, messages } = await composioMcp.prompts.get({
//    serverName: 'googleSheets',
//    name: 'getSpreadsheetData',
//    args: {
//        spreadsheetId: '123',
//        range: 'A1:B2',
//    }
//})
//log.info(prompt)
//log.info(messages)