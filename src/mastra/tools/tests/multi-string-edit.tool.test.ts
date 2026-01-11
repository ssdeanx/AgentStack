// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { multiStringEditTool } from '../multi-string-edit.tool'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const tmpDir = path.join(os.tmpdir(), 'mastra-multi-edit-tests')

beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
    try {
        const files = await fs.readdir(tmpDir)
        for (const f of files) {
            await fs.unlink(path.join(tmpDir, f))
        }
    } catch {}
})

describe('multiStringEditTool', () => {
    it('dry run returns diff and does not modify file', async () => {
        const file = path.join(tmpDir, 'file.txt')
        await fs.writeFile(file, 'hello world', 'utf-8')

        const res = await multiStringEditTool.execute({ edits: [ { filePath: file, oldString: 'hello', newString: 'hi' } ], dryRun: true })
        expect(res.success).toBe(true)
        expect(res.results[0].diff).toBeDefined()
        const content = await fs.readFile(file, 'utf-8')
        expect(content).toBe('hello world')
    })

    it('applies changes and creates backup', async () => {
        const file = path.join(tmpDir, 'apply.txt')
        await fs.writeFile(file, 'foo bar', 'utf-8')

        const res = await multiStringEditTool.execute({ edits: [ { filePath: file, oldString: 'bar', newString: 'baz' } ], dryRun: false, createBackup: true, projectRoot: tmpDir })
        expect(res.success).toBe(true)
        expect(res.results[0].status).toBe('applied')
        const content = await fs.readFile(file, 'utf-8')
        expect(content).toContain('baz')
        const bak = `${file}.bak`
        const bakExists = await fs.readFile(bak, 'utf-8')
        expect(bakExists).toContain('foo bar')
    })
})