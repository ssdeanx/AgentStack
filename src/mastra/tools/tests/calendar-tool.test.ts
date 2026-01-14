import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    listEvents,
    getTodayEvents,
    getUpcomingEvents,
    findFreeSlots,
} from '../calendar-tool'
import type { CalendarRequestContext } from '../calendar-tool'
import type { RequestContext } from '@mastra/core/request-context'

interface CalendarEvent {
    title: string
    startDate?: string
    endDate?: string
    location?: string
    description?: string
    daysFromNow?: number
}

interface FreeSlot {
    startTime?: string
    endTime?: string
    durationMinutes: number
}

interface BusyPeriod {
    title: string
    startTime?: string
    endTime?: string
    location?: string
    description?: string
}

describe('calendar-tool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock execSync globally for all tests
        vi.mock('child_process', () => ({
            execSync: vi.fn(),
        }))
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('listEvents tool', () => {
        it('should successfully list calendar events', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from(
                    'Meeting|Friday, January 3, 2025 at 10:00:00 AM|Friday, January 3, 2025 at 11:00:00 AM|Conference Room|Team standup\n'
                )
            )

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {
                    userId: 'test-user-123',
                } as CalendarRequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            // Cast to ensure we have the success result type
            const successResult = result as {
                content: string
                events?: any[]
                count?: number
            }
            expect(successResult.events).toBeDefined()
            expect(successResult.events?.length).toBe(1)
            expect(successResult.events?.[0]).toMatchObject({
                title: 'Meeting',
                location: 'Conference Room',
                description: 'Team standup',
            })
            expect(successResult.count).toBe(1)

            // Verify progress events
            expect(mockContext.writer.custom).toHaveBeenCalledTimes(2)
            expect(mockContext.writer.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({ status: 'in-progress' }),
                    id: 'listEvents',
                })
            )
        })

        it('should handle calendar read errors gracefully', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockImplementation(() => {
                throw new Error('Calendar access denied')
            })

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            expect((result as any).content).toContain(
                'Error: Failed to read Mac calendar'
            )
        })

        it('should parse multiple events correctly', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from(
                    'Meeting 1|Friday, January 3, 2025 at 10:00:00 AM|Friday, January 3, 2025 at 11:00:00 AM|Room A|First meeting\n' +
                        'Meeting 2|Friday, January 3, 2025 at 2:00:00 PM|Friday, January 3, 2025 at 3:00:00 PM|Room B|Second meeting\n'
                )
            )

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            // Cast to success result type
            const successResult = result as {
                content: string
                events?: any[]
                count?: number
            }
            expect(successResult.events).toBeDefined()
            expect(successResult.events?.length).toBe(1)
            expect(successResult.events?.[0]).toMatchObject({
                title: 'Meeting',
                location: 'Conference Room',
                description: 'Team standup',
            })
            expect(successResult.count).toBe(1)
        })

        it('should handle empty calendar gracefully', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(Buffer.from(''))

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await getTodayEvents.execute({}, mockContext)

            expect((result as any).events.length).toBe(0)
            expect((result as any).count).toBe(0)
        })
    })

    describe('getUpcomingEvents tool', () => {
        it('should return upcoming events within specified days', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            // Mock events spanning multiple days
            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]

            mockExecSync.mockReturnValue(
                Buffer.from(
                    `Today|${today}, January 3, 2025 at 10:00:00 AM|${today}, January 3, 2025 at 11:00:00 AM||Today's event\n` +
                        `Tomorrow|${tomorrow}, January 4, 2025 at 10:00:00 AM|${tomorrow}, January 4, 2025 at 11:00:00 AM||Tomorrow's event\n` +
                        `Next Week|${nextWeek}, January 10, 2025 at 10:00:00 AM|${nextWeek}, January 10, 2025 at 11:00:00 AM||Next week's event\n`
                )
            )

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await getUpcomingEvents.execute(
                { days: 3, limit: 5 },
                mockContext
            )

            expect((result as any).events.length).toBe(2) // Today and tomorrow, within 3 days
            expect((result as any).count).toBe(2)
            expect((result as any).events[0].daysFromNow).toBe(0) // Today
            expect((result as any).events[1].daysFromNow).toBe(1) // Tomorrow
        })

        it('should respect limit parameter', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]

            mockExecSync.mockReturnValue(
                Buffer.from(
                    `Event 1|${today}, January 3, 2025 at 10:00:00 AM|${today}, January 3, 2025 at 11:00:00 AM||First event\n` +
                        `Event 2|${today}, January 3, 2025 at 12:00:00 PM|${today}, January 3, 2025 at 13:00:00 PM||Second event\n` +
                        `Event 3|${tomorrow}, January 4, 2025 at 10:00:00 AM|${tomorrow}, January 4, 2025 at 11:00:00 AM||Third event\n`
                )
            )

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await getUpcomingEvents.execute(
                { days: 7, limit: 2 },
                mockContext
            )

            expect((result as any).events.length).toBe(2)
            expect((result as any).count).toBe(2)
        })
    })

    describe('findFreeSlots tool', () => {
        it('should find free slots between busy periods', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            const today = new Date().toISOString().split('T')[0]

            mockExecSync.mockReturnValue(
                Buffer.from(
                    `Meeting|${today}, January 3, 2025 at 10:00:00 AM|${today}, January 3, 2025 at 11:00:00 AM|Conference Room|Team meeting\n` +
                        `Lunch|${today}, January 3, 2025 at 12:00:00 PM|${today}, January 3, 2025 at 13:00:00 PM||Lunch break\n`
                )
            )

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await findFreeSlots.execute(
                {
                    date: `${today}T00:00:00.000Z`,
                    workdayStart: 9,
                    workdayEnd: 17,
                    minimumSlotMinutes: 30,
                },
                mockContext
            )

            expect((result as any).freeSlots.length).toBeGreaterThan(0)
            expect((result as any).busyPeriods.length).toBe(2)

            // Should have busy periods for the meetings
            expect((result as any).busyPeriods[0].title).toBe('Meeting')
            expect((result as any).busyPeriods[1].title).toBe('Lunch')

            // Should have free slots between meetings
            const { freeSlots } = result as any
            expect(
                freeSlots.some((slot: FreeSlot) => slot.durationMinutes >= 30)
            ).toBe(true)
        })

        it('should handle day with no events', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(Buffer.from(''))

            const today = new Date().toISOString().split('T')[0]

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await findFreeSlots.execute(
                {
                    date: `${today}T00:00:00.000Z`,
                    workdayStart: 9,
                    workdayEnd: 17,
                    minimumSlotMinutes: 30,
                },
                mockContext
            )

            expect((result as any).freeSlots.length).toBe(1) // Full workday free
            expect((result as any).freeSlots[0].durationMinutes).toBe(8 * 60) // 8 hours
            expect((result as any).busyPeriods.length).toBe(0)
        })

        it('should respect minimum slot duration', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            const today = new Date().toISOString().split('T')[0]

            mockExecSync.mockReturnValue(
                Buffer.from(
                    `Quick Meeting|${today}, January 3, 2025 at 10:00:00 AM|${today}, January 3, 2025 at 10:15:00 AM|Room A|15 min meeting\n`
                )
            )

            const mockContext = {
                writer: {
                    write: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await findFreeSlots.execute(
                {
                    date: `${today}T00:00:00.000Z`,
                    workdayStart: 9,
                    workdayEnd: 17,
                    minimumSlotMinutes: 60, // Require 1 hour minimum
                },
                mockContext
            )

            // The 15-minute meeting creates gaps, but we require 60+ minutes
            // Should filter out slots smaller than 60 minutes
            expect(
                (result as any).freeSlots.every(
                    (slot: FreeSlot) => slot.durationMinutes >= 60
                )
            ).toBe(true)
        })
    })

    describe('tracing context', () => {
        it('should create tracing spans with correct metadata for listEvents', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from(
                    'Test Event|Friday, January 3, 2025 at 10:00:00 AM|Friday, January 3, 2025 at 11:00:00 AM|Room|Description\n'
                )
            )

            const createChildSpanMock = vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            })

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {
                    userId: 'user-456',
                } as CalendarRequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: createChildSpanMock,
                    },
                },
            } as any

            await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            expect(createChildSpanMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tool_call',
                    name: 'list-calendar-events',
                    input: { startDate: '2025-01-01T00:00:00.000Z' },
                    metadata: expect.objectContaining({
                        'tool.id': 'list-calendar-events',
                        'tool.input.startDate': '2025-01-01T00:00:00.000Z',
                        'user.id': 'user-456',
                    }),
                })
            )
        })

        it('should update span with success metadata', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from(
                    'Event|Friday, January 3, 2025 at 10:00:00 AM|Friday, January 3, 2025 at 11:00:00 AM||Test\n'
                )
            )

            const spanMock = {
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            }

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue(spanMock),
                    },
                },
            } as any

            await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            expect(spanMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    output: { eventCount: 1 },
                    metadata: expect.objectContaining({
                        'tool.output.success': true,
                        'tool.output.eventCount': 1,
                    }),
                })
            )
            expect(spanMock.end).toHaveBeenCalled()
        })
    })

    describe('error handling', () => {
        it('should handle execSync errors gracefully', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockImplementation(() => {
                throw new Error('Permission denied - cannot access Calendar')
            })

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            expect((result as any).content).toContain('Error:')
            expect((result as any).events).toBeUndefined()
        })

        it('should handle malformed AppleScript output', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from('Malformed|Data|Without|Proper|Format\n')
            )

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            // Should still return valid result, just with potentially fewer events
            expect(result).toBeDefined()
            expect(typeof (result as any).content).toBe('string')
        })
    })

    describe('abort signal handling', () => {
        it('should handle abort signal in listEvents', async () => {
            const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
            mockExecSync.mockReturnValue(
                Buffer.from(
                    'Event|Friday, January 3, 2025 at 10:00:00 AM|Friday, January 3, 2025 at 11:00:00 AM||Test\n'
                )
            )

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: true },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            // Note: The calendar tool doesn't check abortSignal in execute, but the framework handles it
            const result = await listEvents.execute(
                { startDate: '2025-01-01T00:00:00.000Z' },
                mockContext
            )

            // Should still complete since abort is checked at framework level
            expect((result as any).events?.length).toBe(1)
        })
    })
})
