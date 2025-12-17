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
//  tools: [],
  scorers: {},
});

const stepA1 = createStep({
  id: 'stepA1',
  description: 'Starts the message',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Starting message: ${inputData.message}`,
        stage: 'stepA1',
      },
      id: 'stepA1',
    });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Message received: ${inputData.message}`,
        stage: 'stepA1',
      },
      id: 'stepA1',
    });

    return {
      message: inputData.message,
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
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Passing message through: ${inputData.message}`,
        stage: 'stepA2',
      },
      id: 'stepA2',
    });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Message passed through: ${inputData.message}`,
        stage: 'stepA2',
      },
      id: 'stepA2',
    });

    return {
      message: inputData.message,
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
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Checking message: ${inputData.message}`,
        stage: 'stepB2',
      },
      id: 'stepB2',
    });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Message checked: ${inputData.message}`,
        stage: 'stepB2',
      },
      id: 'stepB2',
    });

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
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Modifying message: ${inputData.message}`,
        stage: 'stepC2',
      },
      id: 'stepC2',
    });

    const result = await telephone.generate(`
          You are playing a game of telephone.
          Here is the message the previous person sent ${inputData.message}.
          But you want to change the message.
          Only return the message
          `);

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Message modified: ${result.text}`,
        stage: 'stepC2',
      },
      id: 'stepC2',
    });

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
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Finalizing message: ${inputData.message}`,
        stage: 'stepD2',
      },
      id: 'stepD2',
    });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Message finalized: ${inputData.message}`,
        stage: 'stepD2',
      },
      id: 'stepD2',
    });

    return inputData;
  },
});

const telephoneGameWorkflow = createWorkflow({
  id: 'telephoneGameWorkflow',
  inputSchema: z.object({
    message: z.string(),
  }),
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
