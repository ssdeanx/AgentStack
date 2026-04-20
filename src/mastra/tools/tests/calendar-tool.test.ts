import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import {
    createCalendarSource,
    getCalendarSourceKind,
    parseIcsCalendarEvents,
} from '../calendar-tool'

describe('calendar-tool', () => {
    const createdDirs: Array<string> = []

    afterEach(() => {
        for (const dir of createdDirs.splice(0, createdDirs.length)) {
            rmSync(dir, { recursive: true, force: true })
        }
    })

    it('selects the correct default source for each platform', () => {
        expect(getCalendarSourceKind('darwin')).toBe('macos-calendar')
        expect(getCalendarSourceKind('win32')).toBe('windows-outlook')
        expect(getCalendarSourceKind('linux')).toBe('ics-file')
    })

    it('honors explicit source overrides', () => {
        expect(getCalendarSourceKind('linux', 'macos-calendar')).toBe(
            'macos-calendar'
        )
        expect(getCalendarSourceKind('darwin', 'windows-outlook')).toBe(
            'windows-outlook'
        )
        expect(getCalendarSourceKind('win32', 'ics-file')).toBe('ics-file')
    })

    it('parses events from an ICS calendar export', () => {
        const icsContent = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Engineering Sync
DTSTART:20260420T090000
DTEND:20260420T100000
LOCATION:Room 1
DESCRIPTION:Discuss roadmap\nAnd blockers
END:VEVENT
END:VCALENDAR`

        const events = parseIcsCalendarEvents(icsContent)

        expect(events).toHaveLength(1)
        expect(events[0]?.title).toBe('Engineering Sync')
        expect(events[0]?.location).toBe('Room 1')
        expect(events[0]?.description).toContain('Discuss roadmap')
        expect(events[0]?.startDate).toBeInstanceOf(Date)
        expect(events[0]?.endDate).toBeInstanceOf(Date)
    })

    it('loads events from an ICS file on Linux', () => {
        const tempDir = mkdtempSync(path.join(tmpdir(), 'calendar-tool-'))
        createdDirs.push(tempDir)

        const icsPath = path.join(tempDir, 'calendar.ics')
        writeFileSync(
            icsPath,
            `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Team Planning
DTSTART:20260420T130000Z
DTEND:20260420T140000Z
LOCATION:Virtual
DESCRIPTION:Planning session
END:VEVENT
END:VCALENDAR`,
            'utf8'
        )

        const source = createCalendarSource('linux', 'ics-file', icsPath)
        const events = source.getEvents()

        expect(source.name).toBe('ics-file')
        expect(events).toHaveLength(1)
        expect(events[0]?.title).toBe('Team Planning')
        expect(events[0]?.location).toBe('Virtual')
    })

    it('requires an ICS file when Linux falls back to the ICS source', () => {
        expect(() => createCalendarSource('linux', 'ics-file')).toThrow(
            /CALENDAR_ICS_PATH/i
        )
    })
})
