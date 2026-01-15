import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  mastraThreadsTable,
  mastraMessagesTable,
  mastraResourcesTable,
  mastraScoresTable,
  mastraVectorIndexesTable,
  mastraVectorsTable,
  mastraDocumentsTable,
} from '@mastra/convex/schema';

// Explicitly define mastra_workflow_snapshots to ensure the `id` field exists
// (some downstream Convex schema variants omit `id` which causes an invalid
// index declaration during Convex schema push).
const mastraWorkflowSnapshotsTable = defineTable({
  id: v.string(),
  workflow_name: v.string(),
  run_id: v.string(),
  resourceId: v.optional(v.string()),
  snapshot: v.any(),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index('by_record_id', ['id']).index('by_workflow_run', ['workflow_name', 'run_id']).index('by_workflow', ['workflow_name']).index('by_resource', ['resourceId']).index('by_created', ['createdAt']);

export default defineSchema({
  mastra_threads: mastraThreadsTable,
  mastra_messages: mastraMessagesTable,
  mastra_resources: mastraResourcesTable,
  mastra_workflow_snapshots: mastraWorkflowSnapshotsTable,
  mastra_scorers: mastraScoresTable,
  mastra_vector_indexes: mastraVectorIndexesTable,
  mastra_vectors: mastraVectorsTable,
  mastra_documents: mastraDocumentsTable,
});
