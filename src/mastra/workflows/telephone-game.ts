
import { input } from '@inquirer/prompts';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { googleAIFlashLite, pgMemory } from '../config';

const telephone = new Agent({
  id: 'telephone-game-agent',
  name: 'Telephone Game Agent',
  description: 'Agent for playing the telephone game',
  instructions: `Telephone game agent`,
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: [],
  scorers: {},
});

const stepA1 = createStep({
  id: 'stepA1',
  description: 'Starts the message',
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async () => {
    return {
      message: 'Test',
    };
  },
});

const stepA2 = createStep({
  id: 'stepA2',
  description: 'Pass the message through',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async () => {
    const content = await input({
      message: 'Give me a message',
      validate: value => value.trim().length > 0 || 'Message cannot be empty',
    });

    return {
      message: content,
    };
  },
});

const stepB2 = createStep({
  id: 'stepB2',
  description: 'Checks if the file exists',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      message: inputData.message,
    };
  },
});

const stepC2 = createStep({
  id: 'stepC2',
  description: 'Ask if you should modify the message',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    const result = await telephone.generate(`
          You are playing a game of telephone.
          Here is the message the previous person sent ${inputData.message}.
          But you want to change the message.
          Only return the message
          `);
      return {
        message: result.text,
      };
  },
});

const stepD2 = createStep({
  id: 'stepD2',
  description: 'Pass the message',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    return inputData;
  },
});

const telephoneGameWorkflow = createWorkflow({
  id: 'telephoneGameWorkflow',
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.string(),
  }),
})
  .then(stepA1)
  .then(stepA2)
  .then(stepB2)
  .then(stepC2)
  .then(stepD2);

telephoneGameWorkflow.commit();

export { telephoneGameWorkflow };
