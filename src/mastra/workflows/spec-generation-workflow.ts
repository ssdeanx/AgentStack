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

    const stream = await agent.stream(prompt);
    await stream.textStream?.pipeTo?.(writer);
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
      const jsonMatch = (/```json\n([\s\S]*?)\n```/.exec(text)) || (/\{[\s\S]*\}/.exec(text));
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          plan: parsed.plan ?? text,
          documentsNeeded: parsed.documentsNeeded ?? ['PRD', 'Architecture', 'Tasks']
        };
      }
      return {
        plan: text,
        documentsNeeded: ['PRD', 'Architecture', 'Tasks']
      };
    } catch (e) {
      return {
        plan: result.text,
        documentsNeeded: ['PRD', 'Architecture', 'Tasks']
      };
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
      return { prd: '' };
    }

    const stream = await agent.stream(prompt);
    // stream partial output to the workflow writer if available so callers see progress
    await stream.textStream?.pipeTo?.(writer);
    const finalText = await stream.text;
    const result = { text: finalText };
    return { prd: result?.text || '# PRD\n\n(Generated PRD content)' };
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

    const stream = await agent.stream(prompt);
    await stream.textStream?.pipeTo?.(writer);
    const finalText = await stream.text;
    const result = { text: finalText };
    return { architecture: result?.text || '# Architecture\n\n(Generated Architecture content)', prd: inputData.prd };
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

    const stream = await agent.stream(prompt);
    await stream.textStream?.pipeTo?.(writer);
    const finalText = await stream.text;
    const result = { text: finalText };
    return { tasks: result?.text || '# Tasks\n\n- [ ] Task 1' };
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
