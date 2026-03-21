import { Workspace, LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { DaytonaSandbox } from '@mastra/daytona'
import { log } from './config/logger';

//import { AgentFSFilesystem } from '@mastra/agentfs'
//import { AgentFS } from 'agentfs-sdk'

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
//const agent = await AgentFS.open({ id: 'my-agent' })
//const filesystem = new AgentFSFilesystem({
//  id: 'agentfs-filesystem',
//  agentId: agent,
//  path: '/data/my-agent.db',
//})


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
   /// onStart: async ({ sandboxId }) => {
   ///   log.info(`Sandbox ${sandboxId} started`);
   /// },
   // onStop: async ({ sandboxId }) => {
   //   log.info(`Sandbox ${sandboxId} stopped`);
    }),
  tools: {
    [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
      backgroundProcesses: {
        abortSignal: undefined, // Processes survive agent disconnection
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        onStdout: (data, { pid, toolCallId}) => { log.info(`[${pid}] ${toolCallId}: ${data}`); },
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        onStderr: (data, { pid, toolCallId}) => { log.error(`[${pid}] ${toolCallId}: ${data}`); },
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        onExit: ({ pid, exitCode, toolCallId }) => { log.info(`Process ${pid} ${toolCallId} exited: ${exitCode}`); },
      },
    },
  },
  skills: ['.agents/skills'],
  bm25: true,
});

export const daytonaWorkspace = new Workspace({
  id: "daytona-Workspace",
  name: "DaytonaWorkspace",
  filesystem: new LocalFilesystem({
    id: 'filesystem',
    basePath: './daytona-workspace',
  }),
  sandbox: daytonaSandbox,
  skills: ['./.agents/**/skills'],
  bm25: true,
});