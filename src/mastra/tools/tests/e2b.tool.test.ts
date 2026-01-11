// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @e2b/code-interpreter sandbox
vi.mock('@e2b/code-interpreter', () => {
    return {
        FilesystemEventType: { WRITE: 'WRITE' },
        FileType: { FILE: 'FILE', DIR: 'DIR' },
        Sandbox: {
            create: vi.fn().mockResolvedValue({ sandboxId: 'sb-123' }),
            connect: vi.fn().mockResolvedValue({
                files: {
                    write: vi.fn().mockResolvedValue(true),
                    list: vi.fn().mockResolvedValue([{ name: 'a.txt', path: '/a.txt', type: 'FILE' }]),
                    remove: vi.fn().mockResolvedValue(true),
                    makeDir: vi.fn().mockResolvedValue(true),
                    getInfo: vi.fn().mockResolvedValue({ name: 'a.txt', path: '/a.txt', type: 'FILE', size: 10, mode: 0o644, permissions: 'rw-r--r--', owner: 'user', group: 'group', modifiedTime: new Date(), symlinkTarget: null }),
                    watchDir: vi.fn().mockResolvedValue({ stop: vi.fn().mockResolvedValue(true) })
                },
                commands: {
                    run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'ok\n', stderr: '' }),
                }
            })
        }
    }
})

import { createSandbox, writeFile, runCode } from '../e2b'

describe('e2b tools', () => {
    beforeEach(() => vi.clearAllMocks())

    it('createSandbox returns sandboxId', async () => {
        const res = await createSandbox.execute({}, {})
        expect(res.sandboxId).toBeDefined()
    })

    it('writeFile writes to sandbox', async () => {
        const res = await writeFile.execute({ sandboxId: 'sb-123', path: '/a.txt', content: 'hello' }, {})
        expect(res.success).toBe(true)
        expect(res.path).toBe('/a.txt')
    })

    it('runCode executes code and returns execution JSON', async () => {
        const res = await runCode.execute({ sandboxId: 'sb-123', code: 'print(1)', runCodeOpts: { language: 'python' } }, {})
        expect(res.execution).toBeDefined()
        const exec = JSON.parse(res.execution)
        expect(exec.success).toBe(true)
        expect(Array.isArray(exec.logs.stdout)).toBe(true)
    })
})
