// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { codeAnalysisTool } from '../code-analysis.tool'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const tmpDir = path.join(os.tmpdir(), 'mastra-code-analysis-tests')

beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
    try {
        const files = await fs.readdir(tmpDir)
        for (const f of files) {
            await fs.unlink(path.join(tmpDir, f))
        }
    } catch { /* empty */ }
})

describe('codeAnalysisTool', () => {
    it('computes LOC, detects console and long lines', async () => {
        const file = path.join(tmpDir, 'sample.js')
        const longLine = 'a'.repeat(130)
        const content = `// TODO: test\nconsole.log('hi')\nfunction f() { if (true) { return 1 } }\n${longLine}`
        await fs.writeFile(file, content, 'utf-8')

        const res = await codeAnalysisTool.execute({ target: [file], options: { includeMetrics: true, detectPatterns: true } })
        expect(res.files.length).toBeGreaterThanOrEqual(1)
        const fileRes = res.files.find((f) => f.path === file)
        expect(fileRes).toBeDefined()
        expect(fileRes.loc).toBeGreaterThan(0)
        const hasConsole = fileRes.issues.some((i) => i.rule === 'no-console')
        expect(hasConsole).toBe(true)
        const hasLong = fileRes.issues.some((i) => i.rule === 'max-line-length')
        expect(hasLong).toBe(true)
    })
})