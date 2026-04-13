/**
 * Harness - Multi-mode agent orchestration control layer
 *
 * The Harness class provides thread management, state persistence,
 * tool approvals, and event streaming for multi-mode agent workflows.
 *
 * @see https://mastra.ai/reference/harness/harness-class
 */
import type { Agent as MastraAgent } from '@mastra/core/agent'
import { Harness } from '@mastra/core/harness'
import { z } from 'zod'

import {
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,
} from './agents/codingAgents'
import { researchAgent } from './agents/researchAgent'
import { editorAgent } from './agents/editorAgent'
import { reportAgent } from './agents/reportAgent'
import { mainWorkspace } from './workspaces'
import { LibsqlMemory, libsqlstorage } from './config/libsql'

/**
 * Harness state schema - defines the shape of persisted state
 */
const harnessStateSchema = z.object({
    currentTask: z.string().optional(),
    files: z.array(z.string()).default([]),
    lastMode: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
})

export type HarnessState = z.infer<typeof harnessStateSchema>

const asHarnessAgent = (agent: unknown): MastraAgent => agent as MastraAgent

/**
 * Main Harness instance for AgentStack
 *
 * Modes:
 * - plan: Architecture and planning (codeArchitectAgent)
 * - code: Implementation and coding (codeArchitectAgent)
 * - review: Code review and quality (codeReviewerAgent)
 * - test: Test generation and validation (testEngineerAgent)
 * - refactor: Code refactoring and optimization (refactoringAgent)
 * - research: Research and information gathering (researchAgent)
 * - edit: Content editing and refinement (editorAgent)
 * - report: Report generation and synthesis (reportAgent)
 */
export const mainHarness = new Harness({
    id: 'agentstack-harness',
    resourceId: 'agentstack',
    storage: libsqlstorage,
    // State management
    stateSchema: harnessStateSchema,
    // Agent modes - each represents a different capability/personality
    modes: [
        {
            id: 'plan',
            name: 'Planner',
            agent: asHarnessAgent(codeArchitectAgent),
            default: true,
            color: '#7c3aed', // Purple
        },
        {
            id: 'code',
            name: 'Builder',
            agent: asHarnessAgent(codeArchitectAgent),
            color: '#22c55e', // Green
        },
        {
            id: 'review',
            name: 'Reviewer',
            agent: asHarnessAgent(codeReviewerAgent),
            color: '#f59e0b', // Amber
        },
        {
            id: 'test',
            name: 'Tester',
            agent: asHarnessAgent(testEngineerAgent),
            color: '#3b82f6', // Blue
        },
        {
            id: 'refactor',
            name: 'Refactorer',
            agent: asHarnessAgent(refactoringAgent),
            color: '#ec4899', // Pink
        },
        {
            id: 'research',
            name: 'Researcher',
            agent: asHarnessAgent(researchAgent),
            color: '#06b6d4', // Cyan
        },
        {
            id: 'edit',
            name: 'Editor',
            agent: asHarnessAgent(editorAgent),
            color: '#8b5cf6', // Violet
        },
        {
            id: 'report',
            name: 'Reporter',
            agent: asHarnessAgent(reportAgent),
            color: '#f97316', // Orange
        },
    ],

    // Workspace for filesystem and sandbox access
    workspace: mainWorkspace,

    // Subagent definitions for focused tasks
    subagents: [
        {
            id: 'explore',
            name: 'Explorer',
            description: 'Quick exploration and discovery of codebase patterns',
            instructions:
                'You are a focused exploration agent. Quickly scan and identify relevant patterns, files, and code structures. Be concise and efficient.',
            allowedHarnessTools: [],
        },
        {
            id: 'quick-fix',
            name: 'Quick Fix',
            description: 'Fast, targeted bug fixes and small changes',
            instructions:
                'You are a focused fix agent. Apply minimal, surgical fixes to resolve the specific issue. Do not refactor or optimize beyond what is necessary.',
            allowedHarnessTools: [],
        },
        {
            id: 'deep-dive',
            name: 'Deep Diver',
            description: 'In-depth analysis and comprehensive code understanding',
            instructions:
                'You are a deep dive agent. Thoroughly analyze the codebase, understand complex interactions, and provide detailed insights. Take your time to ensure accuracy.',
            allowedHarnessTools: [],
        }
    ],
})

/**
 * Harness mode identifiers for type-safe mode switching
 */
export const HarnessModes = {
    PLAN: 'plan',
    CODE: 'code',
    REVIEW: 'review',
    TEST: 'test',
    REFACTOR: 'refactor',
    RESEARCH: 'research',
    EDIT: 'edit',
    REPORT: 'report',
} as const

export type HarnessModeId = (typeof HarnessModes)[keyof typeof HarnessModes]
