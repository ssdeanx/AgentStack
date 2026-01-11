// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { codeSearchTool } from '../code-search.tool'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const tmpDir = path.join(os.tmpdir(), 'mastra-code-search-tests')

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

describe('codeSearchTool', () => {
    it('finds simple string matches in files', async () => {
        const file1 = path.join(tmpDir, 'a.js')
        const content = 'const foo = 1\nconsole.log(foo)\n// TODO: remove' 
        await fs.writeFile(file1, content, 'utf-8')

        const res = await codeSearchTool.execute({ pattern: 'foo', target: [file1], options: { includeContext: true } })
        expect(res.matches.length).toBeGreaterThanOrEqual(1)
        expect(res.stats.totalMatches).toBeGreaterThanOrEqual(1)
        expect(res.matches[0].content).toContain('foo')
        expect(res.matches[0].context).toBeDefined()
    })

    it('supports regex and maxResults truncation', async () => {
        const file = path.join(tmpDir, 'b.js')
        const lines = Array.from({ length: 50 }, (_, i) => `val${i}`)
        await fs.writeFile(file, lines.join('\n'), 'utf-8')

        const res = await codeSearchTool.execute({ pattern: 'val\\d+', target: [file], options: { isRegex: true, maxResults: 10 } })
        expect(res.matches.length).toBeLessThanOrEqual(10)
    })
})