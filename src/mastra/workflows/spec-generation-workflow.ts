import type { RequestContext } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

export type UserTier = 'free' | 'pro' | 'enterprise';
export interface SpecRuntimeContext {
  'user-tier': UserTier;
}

// --- Schemas ---

const specInputSchema = z.object({
  request: z.string().describe('The user\'s high-level idea or requirement'),
  context: z.string().optional().describe('Additional context, existing code, or constraints'),
  githubRepo: z.string().optional().describe('GitHub repository (owner/repo) to analyze'),
  githubIssue: z.number().optional().describe('GitHub issue number to reference'),
});

const planOutputSchema = z.object({
  plan: z.string(),
  documentsNeeded: z.array(z.enum(['PRD', 'Architecture', 'Tasks'])),
});

const prdOutputSchema = z.object({
  prd: z.string(),
});

const archOutputSchema = z.object({
  architecture: z.string(),
  prd: z.string(),
});

const tasksOutputSchema = z.object({
  tasks: z.string(),
});

const workflowOutputSchema = z.object({
  plan: z.string(),
  prd: z.string().optional(),
  architecture: z.string().optional(),
  tasks: z.string().optional(),
});

// --- Steps ---

// Step 1: Orchestrator / Planner
// Uses SPARC framework: System, Project, Role, Context
const planStep = createStep({
  id: 'create-plan',
  inputSchema: specInputSchema,
  outputSchema: planOutputSchema,
  execute: async ({ inputData, mastra, requestContext, writer }) => {
    const { request, context, githubRepo, githubIssue } = inputData;
    const agent = mastra?.getAgent('code-architect'); // Use code-architect for planning

    if (!agent) {
      throw new Error('Agent code-architect not found');
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Creating plan for request: ${request.slice(0, 120)}${request.length > 120 ? '…' : ''}`,
        stage: 'create-plan',
      },
      id: 'create-plan',
    });

    const userTierSchema = z.enum(['free', 'pro', 'enterprise']).default('free');
    const userTier = userTierSchema.parse(
      (requestContext as RequestContext<SpecRuntimeContext>)?.get('user-tier')
    );
    const detailLevel = userTier === 'enterprise' ? 'extremely detailed and comprehensive' : 'standard';

    const prompt = `
      [ROLE]
      You are an expert Software Development Orchestrator. Your goal is to analyze a user request and plan the documentation generation process.

      [CONTEXT]
      User Tier: ${userTier} (Please provide a ${detailLevel} plan)
      User Request: ${request}
      Additional Context: ${context ?? 'None'}
      ${githubRepo ? `GitHub Repository: ${githubRepo}` : ''}
      ${githubIssue ? `GitHub Issue: #${githubIssue}` : ''}

      [INSTRUCTIONS]
      ${githubRepo ? `- Use your GitHub tools to inspect the repository '${githubRepo}' for existing architecture and patterns.` : ''}
      ${githubRepo && githubIssue ? `- Fetch details for issue #${githubIssue} to understand specific requirements.` : ''}

      [OUTPUT FORMAT]
      Return a JSON object with:
      - "plan": A markdown string describing the project approach.
      - "documentsNeeded": An array of strings ["PRD", "Architecture", "Tasks"] based on complexity.
    `;

    try {
      const stream = await agent.stream(prompt);
      const finalText = await stream.text;
      const result = { text: finalText };

    // Parse the result assuming the agent returns JSON or we need to extract it
    // For now, we'll assume the agent is configured to return structured output or we parse the text
    // Since codeArchitectAgent uses structuredOutput: true in its config, we might get an object directly if we used the output schema in generate options.
    // However, here we are just getting text. Let's try to parse it if it's a string, or use it if it's an object.

    // Note: In a real scenario, we should pass the schema to agent.generate for structured output.
    // But to keep it simple and compatible with the existing pattern:
      try {
        const { text } = result;
        // Simple heuristic to find JSON in markdown code blocks if present
        const jsonMatch = (/```json\n([\s\S]*?)\n```/.exec(text)) ?? (/\{[\s\S]*\}/.exec(text));
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

          await writer?.custom({
            type: 'data-tool-progress',
            data: {
              status: 'done',
              message: `Plan created (documents: ${(parsed.documentsNeeded ?? ['PRD', 'Architecture', 'Tasks']).join(', ')})`,
              stage: 'create-plan',
            },
            id: 'create-plan',
          });

          return {
            plan: parsed.plan ?? text,
            documentsNeeded: parsed.documentsNeeded ?? ['PRD', 'Architecture', 'Tasks']
          };
        }

        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: 'Plan created (unstructured output parsed as text)',
            stage: 'create-plan',
          },
          id: 'create-plan',
        });

        return {
          plan: text,
          documentsNeeded: ['PRD', 'Architecture', 'Tasks']
        };
      } catch (e) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: `Plan parsing failed; returning text output. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
            stage: 'create-plan',
          },
          id: 'create-plan',
        });

        return {
          plan: result.text,
          documentsNeeded: ['PRD', 'Architecture', 'Tasks']
        };
      }
    } catch (e) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Failed to create plan. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          stage: 'create-plan',
        },
        id: 'create-plan',
      });

      throw e;
    }
  },
});

// Step 2: Product Manager (PRD)
// Uses TCREI: Task, Context, References, Evaluate, Iterate
const prdStep = createStep({
  id: 'generate-prd',
  // This step consumes the output of the planner which includes
  // the generated plan and the documentsNeeded array. The original
  // request is optional here (it may come from earlier workflow input).
  inputSchema: z.object({
    plan: z.string(),
    documentsNeeded: z.array(z.enum(['PRD', 'Architecture', 'Tasks'])),
    request: z.string().optional(),
  }),
  outputSchema: prdOutputSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const { request, plan, documentsNeeded } = inputData;
    const agent = mastra?.getAgent('code-architect');

    if (!agent) {
      throw new Error('Agent code-architect not found');
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating PRD for request: ${(request ?? '').slice(0, 120)}${(request ?? '').length > 120 ? '…' : ''}`,
        stage: 'generate-prd',
      },
      id: 'generate-prd',
    });

    const prompt = `
      [ROLE]
      You are an elite Product Manager using the TCREI framework.

      [TASK]
      Create a comprehensive Product Requirements Document (PRD) for the following request.

      [CONTEXT]
      Project Plan: ${plan}
      Original Request: ${request}

      [REFERENCES]
      - Focus on user stories, acceptance criteria, and functional requirements.
      - Use standard PRD sections: Executive Summary, Goals, User Stories, Non-functional Requirements.

      [EVALUATE]
      Ensure the PRD is actionable and unambiguous for architects and developers.
    `;

    // If PRD isn't needed according to the plan, return an empty PRD
    // to keep the workflow types consistent.
    if (!documentsNeeded?.includes('PRD')) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'PRD skipped (not requested by plan)',
          stage: 'generate-prd',
        },
        id: 'generate-prd',
      });
      return { prd: '' };
    }

    try {
      const stream = await agent.stream(prompt);
      const finalText = await stream.text;
      const result = { text: finalText };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `PRD generated (length: ${(result?.text ?? '').length})`,
          stage: 'generate-prd',
        },
        id: 'generate-prd',
      });

      return { prd: result?.text || '# PRD\n\n(Generated PRD content)' };
    } catch (e) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `PRD generation failed. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          stage: 'generate-prd',
        },
        id: 'generate-prd',
      });

      throw e;
    }
  },
});

// Step 3: Architect (System Design)
// Uses Chain of Thought for architectural decisions
const archStep = createStep({
  id: 'generate-architecture',
  inputSchema: z.object({ prd: z.string() }),
  outputSchema: archOutputSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const { prd } = inputData;
    const agent = mastra?.getAgent('code-architect');

    if (!agent) {
      throw new Error('Agent code-architect not found');
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating architecture from PRD (length: ${prd.length})...`,
        stage: 'generate-architecture',
      },
      id: 'generate-architecture',
    });

    const prompt = `
      [ROLE]
      You are a Senior Software Architect.

      [TASK]
      Design the technical architecture based on the provided PRD.

      [CONTEXT]
      PRD: ${prd}

      [INSTRUCTION - CHAIN OF THOUGHT]
      1. Analyze the functional and non-functional requirements.
      2. Identify key components and their interactions.
      3. Select appropriate technologies and patterns (e.g., microservices, serverless, event-driven).
      4. Address scalability, security, and maintainability.
      5. Output the final design document (ADR style or System Design doc).
    `;

    try {
      const stream = await agent.stream(prompt);
      const finalText = await stream.text;
      const result = { text: finalText };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Architecture generated (length: ${(result?.text ?? '').length})`,
          stage: 'generate-architecture',
        },
        id: 'generate-architecture',
      });

      return { architecture: result?.text || '# Architecture\n\n(Generated Architecture content)', prd: inputData.prd };
    } catch (e) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Architecture generation failed. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          stage: 'generate-architecture',
        },
        id: 'generate-architecture',
      });

      throw e;
    }
  },
});

// Step 4: Engineering Lead (Tasks)
// Uses SPARC to break down work
const tasksStep = createStep({
  id: 'generate-tasks',
  inputSchema: z.object({ architecture: z.string(), prd: z.string() }),
  outputSchema: tasksOutputSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const { architecture, prd } = inputData;
    const agent = mastra?.getAgent('code-architect'); // Using code-architect for task breakdown as well

    if (!agent) {
      throw new Error('Agent code-architect not found');
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating tasks (architecture length: ${architecture.length}, prd length: ${prd.length})...`,
        stage: 'generate-tasks',
      },
      id: 'generate-tasks',
    });

    const prompt = `
      [ROLE]
      You are an Engineering Lead.

      [TASK]
      Create a detailed, phased task list for the development team.

      [CONTEXT]
      PRD: ${prd}
      Architecture: ${architecture}

      [OUTPUT FORMAT]
      - Phase 1: Setup & Core
      - Phase 2: Feature Implementation
      - Phase 3: Testing & Polish

      Each task should have a clear "Definition of Done".
    `;

    try {
      const stream = await agent.stream(prompt);
      const finalText = await stream.text;
      const result = { text: finalText };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Tasks generated (length: ${(result?.text ?? '').length})`,
          stage: 'generate-tasks',
        },
        id: 'generate-tasks',
      });

      return { tasks: result?.text || '# Tasks\n\n- [ ] Task 1' };
    } catch (e) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Task generation failed. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          stage: 'generate-tasks',
        },
        id: 'generate-tasks',
      });

      throw e;
    }
  },
});

// --- Workflow ---

export const specGenerationWorkflow = createWorkflow({
  id: 'specGenerationWorkflow',
  inputSchema: specInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(planStep)
  .then(prdStep)
  .then(archStep)
  .then(tasksStep)
  .commit();
