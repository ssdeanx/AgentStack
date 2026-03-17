import { z } from 'zod'

export const chatTransportRequestSchema = z
  .object({
    id: z.string().optional(),
    messages: z.array(z.unknown()).default([]),
    trigger: z.string().optional(),
    messageId: z.string().optional(),
    requestMetadata: z.unknown().optional(),
    requestContext: z.record(z.string(), z.unknown()).optional(),
    memory: z
      .object({
        thread: z.string().optional(),
        resource: z.string().optional(),
      })
      .partial()
      .optional(),
    data: z
      .object({
        agentId: z.string().min(1).optional(),
        input: z.string().optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

export type ChatTransportRequest = z.infer<typeof chatTransportRequestSchema>