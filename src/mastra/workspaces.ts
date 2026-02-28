import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { DaytonaSandbox } from '@mastra/daytona'

const daytonaSandbox = new DaytonaSandbox({
  id: 'daytona-sandbox',
  name: 'Daytona Sandbox',
  image: 'node:20-slim',
  resources: { cpu: 2, memory: 4, disk: 6 },
  language: 'typescript',
  timeout: 120_000,
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
});

export const mainWorkspace = new Workspace({
  id: "main-Workspace",
  name: "MainWorkspace",
  filesystem: new LocalFilesystem({
    id: 'filesystem',
    basePath: './workspace',
  }),
 // sandbox: daytonaSandbox,
  sandbox: new LocalSandbox({
    id: 'sandbox',
    workingDirectory: './workspace',
  }),
  skills: ['/skills'],
});
