/**
 * Harness API Route - Multi-mode agent orchestration control layer
 *
 * The Harness provides thread management, state persistence, tool approvals,
 * and event streaming for multi-mode agent workflows.
 *
 * @see https://mastra.ai/reference/harness/harness-class
 */
import { generateId } from 'ai'
import { mainHarness } from '../../../src/mastra/harness'

// Track if harness is initialized
let harnessInitialized = false

/**
 * Initialize harness if not already done
 */
async function ensureInitialized() {
    if (!harnessInitialized) {
        await mainHarness.init()
        harnessInitialized = true
    }
}

/**
 * GET /api/harness
 * Get harness information: modes, current state, available threads
 */
export async function GET(req: Request) {
    await ensureInitialized()

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    try {
        switch (action) {
            case 'modes':
                return Response.json({
                    modes: mainHarness.listModes(),
                    currentMode: mainHarness.getCurrentMode(),
                    currentModeId: mainHarness.getCurrentModeId(),
                })

            case 'threads':
                const threads = await mainHarness.listThreads()
                return Response.json({ threads })

            case 'state':
                const state = mainHarness.getState()
                return Response.json({ state })

            case 'workspace':
                const workspace = mainHarness.getWorkspace()
                return Response.json({
                    hasWorkspace: mainHarness.hasWorkspace(),
                    workspace: workspace
                        ? {
                              id: workspace.id,
                              name: workspace.name,
                          }
                        : null,
                })

            case 'messages':
                const threadId = mainHarness.getCurrentThreadId()
                if (!threadId) {
                    return Response.json({ messages: [] })
                }
                const messages =
                    await mainHarness.listMessagesForThread(threadId)
                return Response.json({ messages })

            case 'session':
                const session = await mainHarness.getSession()
                return Response.json({ session })

            default:
                // Default: return harness overview
                return Response.json({
                    id: mainHarness.id,
                    modes: mainHarness.listModes(),
                    currentMode: mainHarness.getCurrentMode(),
                    currentModeId: mainHarness.getCurrentModeId(),
                    currentThreadId: mainHarness.getCurrentThreadId(),
                    state: mainHarness.getState(),
                    hasWorkspace: mainHarness.hasWorkspace(),
                })
        }
    } catch (error) {
        console.error('Harness GET error:', error)
        return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/harness
 * Execute harness actions: send message, switch mode, create thread, steer
 */
export async function POST(req: Request) {
    await ensureInitialized()

    const body = await req.json()
    const { action, data } = body

    try {
        switch (action) {
            case 'thread': {
                // Create or select a thread
                const threadId = data?.threadId
                let thread

                if (threadId) {
                    await mainHarness.switchThread(threadId)
                    thread = { id: threadId }
                } else {
                    thread = await mainHarness.selectOrCreateThread()
                }

                return Response.json({ thread })
            }

            case 'createThread': {
                const title = data?.title
                const thread = await mainHarness.createThread(title)
                return Response.json({ thread })
            }

            case 'switchMode': {
                const { modeId } = data
                if (!modeId) {
                    return Response.json(
                        { error: 'modeId is required' },
                        { status: 400 }
                    )
                }

                await mainHarness.switchMode(modeId)
                return Response.json({
                    success: true,
                    currentMode: mainHarness.getCurrentMode(),
                    currentModeId: mainHarness.getCurrentModeId(),
                })
            }

            case 'setState': {
                const { updates } = data
                if (!updates) {
                    return Response.json(
                        { error: 'updates is required' },
                        { status: 400 }
                    )
                }

                await mainHarness.setState(updates)
                return Response.json({
                    success: true,
                    state: mainHarness.getState(),
                })
            }

            case 'steer': {
                const { content } = data
                if (!content) {
                    return Response.json(
                        { error: 'content is required' },
                        { status: 400 }
                    )
                }

                await mainHarness.steer(content)
                return Response.json({ success: true })
            }

            case 'followUp': {
                const { content } = data
                if (!content) {
                    return Response.json(
                        { error: 'content is required' },
                        { status: 400 }
                    )
                }

                await mainHarness.followUp(content)
                return Response.json({ success: true })
            }

            case 'abort': {
                mainHarness.abort()
                return Response.json({ success: true })
            }

            case 'resolvePlanApproval': {
                const { planId, response } = data
                if (!planId || !response) {
                    return Response.json(
                        { error: 'planId and response are required' },
                        { status: 400 }
                    )
                }

                await mainHarness.respondToPlanApproval(planId, response)
                return Response.json({ success: true })
            }

            case 'respondToQuestion': {
                const { questionId, answer } = data
                if (!questionId || !answer) {
                    return Response.json(
                        { error: 'questionId and answer are required' },
                        { status: 400 }
                    )
                }

                await mainHarness.respondToQuestion(questionId, answer)
                return Response.json({ success: true })
            }

            case 'grantSessionCategory': {
                const { category } = data
                if (!category) {
                    return Response.json(
                        { error: 'category is required' },
                        { status: 400 }
                    )
                }

                mainHarness.grantSessionCategory(category)
                return Response.json({ success: true })
            }

            case 'grantSessionTool': {
                const { toolName } = data
                if (!toolName) {
                    return Response.json(
                        { error: 'toolName is required' },
                        { status: 400 }
                    )
                }

                mainHarness.grantSessionTool(toolName)
                return Response.json({ success: true })
            }

            case 'sendMessage':
            case 'stream':
            default: {
                // Send a message through the harness
                const { content } = data

                if (!content) {
                    return Response.json(
                        { error: 'content is required' },
                        { status: 400 }
                    )
                }

                // Ensure thread exists
                await mainHarness.selectOrCreateThread()

                // Send the message - harness handles streaming via subscribe()
                await mainHarness.sendMessage(content)

                // Return the messages after sending
                const currentThreadId = mainHarness.getCurrentThreadId()
                const threadIdString = currentThreadId || generateId()
                const messages =
                    await mainHarness.listMessagesForThread(threadIdString)

                return Response.json({
                    success: true,
                    messages,
                    currentThreadId: mainHarness.getCurrentThreadId(),
                })
            }
        }
    } catch (error) {
        console.error('Harness POST error:', error)
        return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
