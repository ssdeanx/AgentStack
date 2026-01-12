import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cytoscapeTool, CytoscapeContext } from '../cytoscape.tool'

describe('cytoscapeTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const createMockContext = (
        overrides: Partial<CytoscapeContext> = {}
    ): any => ({
        writer: {
            custom: vi.fn().mockResolvedValue(undefined),
        } as any,
        abortSignal: { aborted: false } as AbortSignal,
        requestContext: {
            userId: 'test-user',
            workspaceId: 'test-workspace',
            ...overrides,
        } as CytoscapeContext,
        tracingContext: {
            currentSpan: {
                createChildSpan: vi.fn().mockReturnValue({
                    update: vi.fn(),
                    end: vi.fn(),
                    error: vi.fn(),
                }),
            },
        } as any,
    })

    it('should generate valid graph elements from nodes and edges', async () => {
        const mockContext = createMockContext()

        const result = await (cytoscapeTool as any).execute(
            {
                nodes: [
                    { id: 'node1', label: 'Node 1', type: 'circle' },
                    { id: 'node2', label: 'Node 2', type: 'rectangle' },
                ],
                edges: [
                    { source: 'node1', target: 'node2', label: 'relates to' },
                ],
            },
            mockContext
        )

        expect(result.elements).toHaveLength(3) // 2 nodes + 1 edge
        expect(result.layout.name).toBe('cose')

        // Check node elements
        const nodes = result.elements.filter((e: any) => e.group === 'nodes')
        expect(nodes).toHaveLength(2)
        expect(nodes[0].data.id).toBe('node1')
        expect(nodes[1].data.id).toBe('node2')

        // Check edge elements
        const edges = result.elements.filter((e: any) => e.group === 'edges')
        expect(edges).toHaveLength(1)
        expect(edges[0].data.source).toBe('node1')
        expect(edges[0].data.target).toBe('node2')
    })

    it('should use specified layout', async () => {
        const mockContext = createMockContext()

        const result = await (cytoscapeTool as any).execute(
            {
                nodes: [{ id: 'node1' }],
                edges: [],
                layout: 'grid',
            },
            mockContext
        )

        expect(result.layout.name).toBe('grid')
        expect(result.layout.animate).toBe(true)
    })

    it('should create tracing span with correct metadata', async () => {
        const mockContext = createMockContext()

        await (cytoscapeTool as any).execute(
            {
                nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
                edges: [
                    { source: 'n1', target: 'n2' },
                    { source: 'n2', target: 'n3' },
                ],
            },
            mockContext
        )

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tool_call',
                name: 'cytoscape-generator',
                input: expect.objectContaining({
                    nodes: expect.any(Array),
                    edges: expect.any(Array),
                }),
                metadata: expect.objectContaining({
                    'tool.id': 'cytoscape-generator',
                    'tool.input.nodesCount': 3,
                    'tool.input.edgesCount': 2,
                    'user.id': 'test-user',
                    'workspace.id': 'test-workspace',
                }),
            })
        )
    })

    it('should emit progress events', async () => {
        const mockContext = createMockContext()
        const customMock = mockContext.writer.custom

        await (cytoscapeTool as any).execute(
            {
                nodes: [{ id: 'n1' }],
                edges: [],
            },
            mockContext
        )

        expect(customMock).toHaveBeenCalled()
        const calls = customMock.mock.calls
        const progressEvents = calls.filter(
            (call: any[]) => call[0]?.type === 'data-tool-progress'
        )
        expect(progressEvents.length).toBe(2)

        expect(progressEvents[0][0].data.status).toBe('in-progress')
        expect(progressEvents[0][0].data.message).toContain(
            'Generating graph with 1 nodes'
        )

        expect(progressEvents[1][0].data.status).toBe('done')
        expect(progressEvents[1][0].data.message).toContain(
            'Graph data generation complete'
        )
    })

    it('should throw error when cancelled', async () => {
        const mockContext = createMockContext()
        mockContext.abortSignal = { aborted: true } as unknown as AbortSignal

        await expect(
            (cytoscapeTool as any).execute(
                { nodes: [{ id: 'n1' }], edges: [] },
                mockContext
            )
        ).rejects.toThrow('Tool call cancelled')
    })

    it('should update span with processing time', async () => {
        const mockContext = createMockContext()

        await (cytoscapeTool as any).execute(
            {
                nodes: [{ id: 'n1' }, { id: 'n2' }],
                edges: [{ source: 'n1', target: 'n2' }],
            },
            mockContext
        )

        const span = mockContext.tracingContext.currentSpan.createChildSpan()
        expect(span.update).toHaveBeenCalledWith(
            expect.objectContaining({
                output: expect.objectContaining({
                    elements: expect.any(Array),
                    layout: 'cose',
                }),
                metadata: expect.objectContaining({
                    'tool.output.success': true,
                    'tool.output.elementsCount': 3,
                    'tool.duration_ms': expect.any(Number),
                }),
            })
        )
        expect(span.end).toHaveBeenCalled()
    })

    it('should handle empty nodes and edges', async () => {
        const mockContext = createMockContext()

        const result = await (cytoscapeTool as any).execute(
            { nodes: [], edges: [] },
            mockContext
        )

        expect(result.elements).toHaveLength(0)
        expect(result.layout.name).toBe('cose')
    })

    it('should preserve node data and position', async () => {
        const mockContext = createMockContext()

        const result = await (cytoscapeTool as any).execute(
            {
                nodes: [
                    {
                        id: 'n1',
                        label: 'Important',
                        type: 'star',
                        data: { priority: 'high', score: 100 },
                        position: { x: 150, y: 200 },
                    },
                ],
                edges: [],
            },
            mockContext
        )

        const node = result.elements[0]
        expect(node.group).toBe('nodes')
        expect(node.data.id).toBe('n1')
        expect(node.data.label).toBe('Important')
        expect(node.data.type).toBe('star')
        expect(node.data.priority).toBe('high')
        expect(node.data.score).toBe(100)
        expect(node.position).toEqual({ x: 150, y: 200 })
    })

    it('should handle edge data', async () => {
        const mockContext = createMockContext()

        const result = await (cytoscapeTool as any).execute(
            {
                nodes: [{ id: 'n1' }, { id: 'n2' }],
                edges: [
                    {
                        id: 'e1',
                        source: 'n1',
                        target: 'n2',
                        label: 'depends on',
                        type: 'dashed',
                        data: { weight: 0.8 },
                    },
                ],
            },
            mockContext
        )

        const edge = result.elements.find((e: any) => e.group === 'edges')
        expect(edge.data.id).toBe('e1')
        expect(edge.data.label).toBe('depends on')
        expect(edge.data.type).toBe('dashed')
        expect(edge.data.weight).toBe(0.8)
    })

    it('should handle all layout types', async () => {
        const mockContext = createMockContext()
        const layouts = [
            'grid',
            'circle',
            'concentric',
            'breadthfirst',
            'cose',
        ] as const

        for (const layout of layouts) {
            const result = await (cytoscapeTool as any).execute(
                { nodes: [{ id: 'n' }], edges: [], layout },
                mockContext
            )
            expect(result.layout.name).toBe(layout)
        }
    })
})
