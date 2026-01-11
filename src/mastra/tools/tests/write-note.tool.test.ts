// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeNoteTool } from '../write-note'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { log } from '../../config/logger'

vi.mock('node:fs/promises', () => ({
    mkdir: vi.fn(),
    writeFile: vi.fn(),
}))
vi.mock('node:path', () => ({
    join: vi.fn().mockImplementation((...parts) => parts.join('/')),
}))
vi.mock('../../config/logger', () => ({ log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

const createMockWriter = () => ({ custom: vi.fn() })

describe('writeNoteTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should write a note successfully', async () => {
        const mockWriter = createMockWriter()
        const res = await writeNoteTool.execute(
            { title: 'test-note', content: '# Hello' },
            { writer: mockWriter }
        )

        expect(fs.mkdir).toHaveBeenCalled()
        expect(fs.writeFile).toHaveBeenCalledWith('notes/test-note.md', '# Hello', 'utf-8')
        expect(res).toContain('Successfully wrote to note')
        expect(mockWriter.custom).toHaveBeenCalled()
    })

    it('should surface write errors and log', async () => {
        const mockWriter = createMockWriter()
        const mockFs = vi.mocked(fs)
        mockFs.writeFile.mockRejectedValueOnce(new Error('disk full'))

        await expect(
            writeNoteTool.execute({ title: 'bad', content: 'x' }, { writer: mockWriter })
        ).rejects.toThrow(/disk full/)

        expect(log.error).toHaveBeenCalled()
        expect(mockWriter.custom).toHaveBeenCalled()
    })
})