import { MastraSandbox, SandboxProcessManager } from '@mastra/core/workspace'
import type {
    ProcessHandle,
    ProcessInfo,
    ProviderStatus,
    SpawnProcessOptions,
} from '@mastra/core/workspace'

let sandboxInstanceCounter = 0

class MyProcessManager extends SandboxProcessManager<MySandbox> {
    async spawn(_command: string, _options: SpawnProcessOptions = {}): Promise<ProcessHandle> {
        throw new Error('spawn method not implemented')
    }

    async list(): Promise<ProcessInfo[]> {
        return Array.from(this._tracked.values()).map((handle) => ({
            pid: handle.pid,
            running: handle.exitCode === undefined,
            exitCode: handle.exitCode,
        }))
    }
}

class MySandbox extends MastraSandbox {
    id = `mysandbox-${++sandboxInstanceCounter}`
    name = 'MySandbox'
    provider = 'local'
    status: ProviderStatus = 'stopped' as ProviderStatus

    constructor() {
        super({
            name: 'MySandbox',
            processes: new MyProcessManager(),
        })
    }

    setStatus(status: ProviderStatus) {
        this.status = status
    }

    markRunning() {
        this.status = 'running' as ProviderStatus
    }

    markStopped() {
        this.status = 'stopped' as ProviderStatus
    }
}
