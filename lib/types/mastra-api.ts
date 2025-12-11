import { z } from "zod"

// Agent Types
export const ModelSchema = z.object({
  provider: z.string(),
  name: z.string(),
})

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  // Some SDK responses include the model id string while others return an object
  modelId: z.string().optional(),
  model: z.union([z.string(), ModelSchema]).optional(),
  instructions: z.string().optional(),
  // Tools can be provided as an array or as a record keyed by tool id
  tools: z.union([
    z.array(z.union([z.string(), z.object({ id: z.string(), name: z.string().optional() })])),
    z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })),
  ]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})
export type Agent = z.infer<typeof AgentSchema>

export const AgentEvalsSchema = z.object({
  ci: z.array(
    z.object({
      name: z.string().optional(),
      score: z.number().optional(),
      passed: z.boolean().optional(),
    })
  ),
  live: z.array(
    z.object({
      name: z.string().optional(),
      score: z.number().optional(),
      status: z.string().optional(),
    })
  ),
})
export type AgentEvals = z.infer<typeof AgentEvalsSchema>

// Workflow Types
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
})
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  // Workflows may define steps as an array or as a keyed record
  steps: z.union([z.array(WorkflowStepSchema), z.record(z.string(), WorkflowStepSchema)]).optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
})
export type Workflow = z.infer<typeof WorkflowSchema>

// Tool Types
export const ToolSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
})
export type Tool = z.infer<typeof ToolSchema>

// Trace Types
export const SpanSchema = z.object({
  spanId: z.string(),
  traceId: z.string(),
  name: z.string().optional(),
  spanType: z.string().optional(),
  duration: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  depth: z.number().optional(),
})
export type Span = z.infer<typeof SpanSchema>

export const TraceSchema = z.object({
  traceId: z.string(),
  name: z.string().optional(),
  spanType: z.string().optional(),
  duration: z.number().optional(),
  startTime: z.string().optional(),
  status: z.string().optional(),
  spans: z.array(SpanSchema).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})
export type Trace = z.infer<typeof TraceSchema>

export const PaginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  total: z.number().optional(),
})
export type Pagination = z.infer<typeof PaginationSchema>

export const TracesResponseSchema = z.object({
  spans: z.array(SpanSchema),
  pagination: PaginationSchema,
})
export type TracesResponse = z.infer<typeof TracesResponseSchema>

// Memory Types
export const MemoryThreadSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  resourceId: z.string().optional(),
  agentId: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type MemoryThread = z.infer<typeof MemoryThreadSchema>

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  // Content can be a raw string or a richer structured object with 'content' or 'parts'
  content: z.union([
    z.string(),
    z.object({ content: z.string() }),
    z.object({ parts: z.array(z.object({ text: z.string().optional(), type: z.string().optional() })) }),
  ]),
  format: z.number().optional(),
  threadId: z.string().optional(),
  createdAt: z.string().optional(),
  type: z.string().optional(),
})
export type Message = z.infer<typeof MessageSchema>

export const WorkingMemorySchema = z.object({
  workingMemory: z.string().nullable(),
  source: z.enum(["thread", "resource"]).optional(),
  workingMemoryTemplate: z.string().optional(),
  threadExists: z.boolean().optional(),
})
export type WorkingMemory = z.infer<typeof WorkingMemorySchema>

// Log Types
export const LogEntrySchema = z.object({
  id: z.string().optional(),
  level: z.string(),
  message: z.string(),
  timestamp: z.string().optional(),
  source: z.string().optional(),
  runId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type LogEntry = z.infer<typeof LogEntrySchema>

// Telemetry Types
export const TelemetryEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  scope: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})
export type TelemetryEntry = z.infer<typeof TelemetryEntrySchema>

// Vector Types
export const VectorIndexSchema = z.object({
  name: z.string(),
  dimension: z.number().optional(),
  metric: z.string().optional(),
  count: z.number().optional(),
})
export type VectorIndex = z.infer<typeof VectorIndexSchema>

export const VectorQueryResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  vector: z.array(z.number()).optional(),
})
export type VectorQueryResult = z.infer<typeof VectorQueryResultSchema>

// AI Span Type (matching MastraClient)
export type AISpanType =
  | "agent"
  | "workflow"
  | "tool"
  | "llm"
  | "embedding"
  | "retrieval"
  | "reranking"
