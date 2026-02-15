import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';

export const mainWorkspace = new Workspace({
  id: "main-Workspace",
  name: "MainWorkspace",
  filesystem: new LocalFilesystem({
    id: 'filesystem',
    basePath: './workspace',
  }),
  sandbox: new LocalSandbox({
    id: 'sandbox',
    workingDirectory: './workspace',
  }),
  skills: ['/skills'],
});
