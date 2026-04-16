'use client'

import type { GetAgentResponse } from '@mastra/client-js'

export type RuntimeAgentCategory =
    | 'core'
    | 'research'
    | 'content'
    | 'data'
    | 'financial'
    | 'diagram'
    | 'utility'
    | 'business'
    | 'coding'

export interface RuntimeAgentFeatures {
    reasoning: boolean
    chainOfThought: boolean
    tools: boolean
    sources: boolean
    canvas: boolean
    artifacts: boolean
    fileUpload: boolean
    plan: boolean
    task: boolean
    confirmation: boolean
    checkpoint: boolean
    queue: boolean
    codeBlocks: boolean
    images: boolean
    webPreview: boolean
}

export interface RuntimeAgentConfig {
    id: string
    name: string
    description: string
    category: RuntimeAgentCategory
    features: RuntimeAgentFeatures
    provider?: string
    modelId?: string
    modelVersion?: string
    workspaceId?: string
    browserTools: string[]
    workspaceTools: string[]
    skillNames: string[]
    toolCount: number
    workflowCount: number
    childAgentCount: number
}

export interface RuntimeChatModel {
    id: string
    name: string
    provider: string
    contextWindow?: number
    description?: string
}

export const DEFAULT_CHAT_AGENT_ID = 'weatherAgent' as const

export const RUNTIME_AGENT_CATEGORY_LABELS: Record<RuntimeAgentCategory, string> = {
    core: 'Core',
    research: 'Research & Documents',
    content: 'Content & Writing',
    data: 'Data & Documents',
    financial: 'Financial Intelligence',
    diagram: 'Diagrams & Visuals',
    utility: 'Utilities',
    business: 'Business & Operations',
    coding: 'Coding & Repos',
}

export const RUNTIME_AGENT_CATEGORY_ORDER: RuntimeAgentCategory[] = [
    'core',
    'research',
    'content',
    'data',
    'financial',
    'diagram',
    'utility',
    'business',
    'coding',
]

const DEFAULT_AGENT_FEATURES: RuntimeAgentFeatures = {
    reasoning: true,
    chainOfThought: true,
    tools: false,
    sources: false,
    canvas: false,
    artifacts: false,
    fileUpload: false,
    plan: false,
    task: false,
    confirmation: false,
    checkpoint: true,
    queue: false,
    codeBlocks: true,
    images: true,
    webPreview: false,
}

interface RuntimeAgentLike {
    id: string
    name: string
    description?: string
    provider?: string
    modelId?: string
    modelVersion?: string
    workspaceId?: string
    browserTools?: string[]
    workspaceTools?: string[]
    tools?: GetAgentResponse['tools']
    workflows?: GetAgentResponse['workflows']
    agents?: GetAgentResponse['agents']
    skills?: GetAgentResponse['skills']
}

/**
 * Counts items in an array-like or record-like collection.
 */
function countCollectionItems(value: unknown): number {
    if (Array.isArray(value)) {
        return value.length
    }

    if (typeof value === 'object' && value !== null) {
        return Object.keys(value as Record<string, unknown>).length
    }

    return 0
}

/**
 * Normalizes a free-form runtime agent surface into one searchable lowercase string.
 */
function getAgentSearchText(agent: RuntimeAgentLike): string {
    return [
        agent.id,
        agent.name,
        agent.description ?? '',
        agent.provider ?? '',
        agent.modelId ?? '',
        ...(agent.browserTools ?? []),
        ...(agent.workspaceTools ?? []),
        ...(agent.skills ?? []).map((skill) => skill.name),
    ]
        .join(' ')
        .toLowerCase()
}

/**
 * Checks whether the runtime agent metadata includes any of the provided keywords.
 */
function includesKeyword(agent: RuntimeAgentLike, keywords: readonly string[]): boolean {
    const text = getAgentSearchText(agent)
    return keywords.some((keyword) => text.includes(keyword))
}

/**
 * Infers a stable UI category from live runtime agent metadata instead of static config.
 */
export function inferRuntimeAgentCategory(
    agent: RuntimeAgentLike
): RuntimeAgentCategory {
    if (
        includesKeyword(agent, [
            'architect',
            'review',
            'reviewer',
            'refactor',
            'test engineer',
            'testengineer',
            'coding',
            'repo',
            'github',
            'commit',
            'code ',
            ' code',
        ])
    ) {
        return 'coding'
    }

    if (
        includesKeyword(agent, [
            'stock',
            'finance',
            'financial',
            'market',
            'chart',
            'trading',
            'analysis',
            'technical analysis',
        ])
    ) {
        return 'financial'
    }

    if (
        includesKeyword(agent, [
            'diagram',
            'draw',
            'excalidraw',
            'graph',
            'mapping',
            'map',
            'visual',
            'chartjs',
            'chart js',
        ])
    ) {
        return 'diagram'
    }

    if (
        includesKeyword(agent, [
            'csv',
            'json',
            'xml',
            'data export',
            'data ingestion',
            'data transformation',
            'ingest',
            'transform',
            'export',
        ])
    ) {
        return 'data'
    }

    if (
        includesKeyword(agent, [
            'research',
            'document',
            'paper',
            'knowledge',
            'rag',
            'index',
            'arxiv',
            'search',
            'source',
        ])
    ) {
        return 'research'
    }

    if (
        includesKeyword(agent, [
            'copywriter',
            'editor',
            'content',
            'script',
            'report',
            'writer',
            'editorial',
        ])
    ) {
        return 'content'
    }

    if (
        includesKeyword(agent, [
            'legal',
            'business',
            'compliance',
            'contract',
            'support',
            'translation',
            'project management',
            'marketing',
            'seo',
            'social media',
            'customer',
        ])
    ) {
        return 'business'
    }

    if (
        includesKeyword(agent, [
            'weather',
            'calendar',
            'note',
            'browser',
            'fetch',
            'utility',
            'color',
            'acp',
            'dane',
        ])
    ) {
        return 'utility'
    }

    return 'core'
}

/**
 * Derives display-oriented feature flags from the runtime agent payload.
 * These flags stay permissive where the UI only renders when matching data exists.
 */
export function inferRuntimeAgentFeatures(
    agent: RuntimeAgentLike,
    category = inferRuntimeAgentCategory(agent)
): RuntimeAgentFeatures {
    const toolCount = countCollectionItems(agent.tools)
    const workflowCount = countCollectionItems(agent.workflows)
    const childAgentCount = countCollectionItems(agent.agents)
    const browserToolCount = agent.browserTools?.length ?? 0
    const workspaceToolCount = agent.workspaceTools?.length ?? 0
    const hasTooling =
        toolCount + workflowCount + childAgentCount + browserToolCount + workspaceToolCount >
        0

    return {
        ...DEFAULT_AGENT_FEATURES,
        tools: hasTooling,
        sources:
            hasTooling ||
            category === 'research' ||
            category === 'financial' ||
            includesKeyword(agent, [
                'research',
                'citation',
                'source',
                'analysis',
                'document',
                'report',
            ]),
        canvas:
            category === 'diagram' ||
            includesKeyword(agent, ['diagram', 'chart', 'draw', 'visual']),
        artifacts:
            category === 'content' ||
            category === 'diagram' ||
            category === 'coding' ||
            includesKeyword(agent, [
                'report',
                'document',
                'generate',
                'editor',
                'write',
                'diagram',
                'artifact',
            ]),
        fileUpload:
            category === 'research' ||
            category === 'data' ||
            category === 'diagram' ||
            category === 'coding' ||
            includesKeyword(agent, [
                'pdf',
                'csv',
                'file',
                'document',
                'image',
                'upload',
            ]),
        plan:
            workflowCount > 0 ||
            childAgentCount > 0 ||
            category === 'research' ||
            category === 'business' ||
            category === 'coding' ||
            includesKeyword(agent, [
                'plan',
                'strategy',
                'workflow',
                'supervisor',
                'coordinator',
                'delegate',
            ]),
        task: hasTooling || childAgentCount > 0,
        confirmation: hasTooling,
        queue: hasTooling || workflowCount > 0,
        webPreview:
            browserToolCount > 0 ||
            category === 'diagram' ||
            category === 'coding' ||
            includesKeyword(agent, [
                'browser',
                'preview',
                'web',
                'ui',
                'html',
                'chart',
                'diagram',
            ]),
    }
}

/**
 * Builds the runtime-first agent config consumed by the chat UI.
 */
export function createRuntimeAgentConfig(
    agent: RuntimeAgentLike | null | undefined
): RuntimeAgentConfig | undefined {
    if (!agent) {
        return undefined
    }

    const category = inferRuntimeAgentCategory(agent)
    const features = inferRuntimeAgentFeatures(agent, category)

    return {
        id: agent.id,
        name: agent.name.trim().length > 0 ? agent.name : agent.id,
        description: agent.description?.trim() || 'AI-powered assistant',
        category,
        features,
        provider: agent.provider,
        modelId: agent.modelId,
        modelVersion: agent.modelVersion,
        workspaceId: agent.workspaceId,
        browserTools: agent.browserTools ?? [],
        workspaceTools: agent.workspaceTools ?? [],
        skillNames: (agent.skills ?? []).map((skill) => skill.name),
        toolCount: countCollectionItems(agent.tools),
        workflowCount: countCollectionItems(agent.workflows),
        childAgentCount: countCollectionItems(agent.agents),
    }
}

/**
 * Groups runtime agent configs by inferred category for selector UIs.
 */
export function groupRuntimeAgentsByCategory(
    agents: RuntimeAgentConfig[]
): Record<RuntimeAgentCategory, RuntimeAgentConfig[]> {
    const grouped: Record<RuntimeAgentCategory, RuntimeAgentConfig[]> = {
        core: [],
        research: [],
        content: [],
        data: [],
        financial: [],
        diagram: [],
        utility: [],
        business: [],
        coding: [],
    }

    for (const agent of agents) {
        grouped[agent.category].push(agent)
    }

    return grouped
}

/**
 * Formats token counts for model context displays when live metadata provides them.
 */
export function formatRuntimeContextWindow(tokens?: number): string {
    if (typeof tokens !== 'number' || !Number.isFinite(tokens) || tokens <= 0) {
        return 'Unknown context'
    }

    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M`
    }

    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(0)}K`
    }

    return String(tokens)
}
