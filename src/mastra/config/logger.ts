import { PinoLogger } from "@mastra/loggers";
import { FileTransport } from "@mastra/loggers/file";
import * as fs from 'node:fs'
import * as path from 'node:path'
import { trace, propagation, context as otelContext } from '@opentelemetry/api'

// Use __dirname directly for CommonJS
//const __dirname: string = path.resolve(path.dirname(''));

// Ensure logs directory exists
const logsDir: string = path.join(process.cwd(), 'data', 'logs')
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
}

// OpenTelemetry helpers to enrich logs with trace context and Baggage
const getActiveSpanContextInfo = () => {
    const span = trace.getActiveSpan()
    if (!span) {
        return { traceId: undefined, spanId: undefined }
    }
    const sc = (span as any).spanContext ? (span as any).spanContext() : undefined
    return { traceId: sc?.traceId, spanId: sc?.spanId }
}

const BaggageToObject = (b: unknown) => {
    if (b === null || b === undefined) {
        return {}
    }
    const obj: Record<string, string> = {}
    for (const [k, v] of (b as any).getAllEntries()) {
        obj[k] = String(v.value)
    }
    return obj
}

const attachTraceAndBaggage = (data: Record<string, unknown> = {}) => {
    try {
        const traceInfo = getActiveSpanContextInfo()
        const bag = propagation.getBaggage(otelContext.active())
        return { ...data, _trace: traceInfo, _Baggage: BaggageToObject(bag) }
    } catch {
        // Don't throw from logging helpers
        return data
    }
}

// Enhanced PinoLogger with full tracing integration
export const log = new PinoLogger({
    name: 'MastraLogger',
    level: 'debug',
    // Enable pretty printing in development
    ...(process.env.NODE_ENV === 'development' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
    formatters: {
        // Add custom formatter to include trace and baggage info
//        log(object) {
//            return attachTraceAndBaggage(object)
//        },
    },

})

// Create a simple file logger wrapper
//
const logFilePath: string = path.join(logsDir, 'workflow.log')
const logToFile = (message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
        timestamp,
        message,
        ...data,
    }
    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n')
}

export const logWorkflowStart = (
    workflowId: string,
    input: Record<string, unknown>
) => {
    const message = `🚀 Starting workflow: ${workflowId}`
    let data: {
        workflowId: string
        input: Record<string, unknown>
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        workflowId,
        input,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logWorkflowEnd = (
    workflowId: string,
    output: Record<string, unknown>,
    duration: number
) => {
    const message = `✅ Workflow completed: ${workflowId}`
    let data: {
        workflowId: string
        output: Record<string, unknown>
        duration: string
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        workflowId,
        output,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logStepStart = (
    stepId: string,
    input: Record<string, unknown>
) => {
    const message = `📋 Starting step: ${stepId}`
    let data: {
        stepId: string
        input: Record<string, unknown>
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        stepId,
        input,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logStepEnd = (
    stepId: string,
    output: Record<string, unknown>,
    duration: number
) => {
    const message = `✓ Step completed: ${stepId}`
    let data: {
        stepId: string
        output: Record<string, unknown>
        duration: string
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        stepId,
        output,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logToolExecution = (
    toolId: string,
    input: Record<string, unknown>,
    output?: Record<string, unknown>
) => {
    const message = `🔧 Tool execution: ${toolId}`
    let data: {
        toolId: string
        input: Record<string, unknown>
        output?: Record<string, unknown>
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        toolId,
        input,
        output,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logAgentActivity = (
    agentId: string,
    action: string,
    details: Record<string, unknown>
) => {
    const message = `🤖 Agent activity: ${agentId} - ${action}`
    let data: {
        agentId: string
        action: string
        details: Record<string, unknown>
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        agentId,
        action,
        details,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(message, data)
    logToFile(message, data)
}

export const logError = (
    component: string,
    error: Error | unknown,
    context?: Record<string, unknown>
) => {
    const message = `❌ Error in ${component}`
    let data: {
        component: string
        error: string
        stack?: string
        context?: Record<string, unknown>
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        component,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.error(message, data)
    logToFile(message, data)
}

export const logProgress = (
    message: string,
    progress: number,
    total: number
) => {
    const logMessage = `📊 Progress: ${message} (${progress}/${total})`
    let data: {
        message: string
        progress: number
        total: number
        percentage: number
        timestamp: string
        _trace?: Record<string, unknown>
        _Baggage?: Record<string, string>
    } = {
        message,
        progress,
        total,
        percentage: Math.round((progress / total) * 100),
        timestamp: new Date().toISOString(),
    }
    data = attachTraceAndBaggage(data) as typeof data
    log.info(logMessage, data)
    logToFile(logMessage, data)
}
