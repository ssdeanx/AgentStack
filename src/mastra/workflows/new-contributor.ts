import { Agent } from '@mastra/core/agent';
import { googleAIFlashLite } from '../config/google';
import { pgMemory } from '../config/pg-storage';


export const daneNewContributor = new Agent({
  id: 'dane-new-contributor',
  name: 'DaneNewContributor',
  instructions: `
    You're Dane, the best GitHub open-source maintainer in the world.
    Your tone is friendly and joyful.
    When a new contributor creates a pull request, they see your message first.
    `,
  model: googleAIFlashLite,
  tools: {},
  memory: pgMemory,
});
