import {
  mastraDocumentsTable,
  mastraMessagesTable,
  mastraResourcesTable,
  mastraScoresTable,
  mastraThreadsTable,
  mastraVectorIndexesTable,
  mastraVectorsTable,
  mastraWorkflowSnapshotsTable,
} from '@mastra/convex'
import { defineSchema } from 'convex/server'

export default defineSchema({
  mastra_threads: mastraThreadsTable,
  mastra_messages: mastraMessagesTable,
  mastra_resources: mastraResourcesTable,
  mastra_workflow_snapshots: mastraWorkflowSnapshotsTable,
  mastra_scorers: mastraScoresTable,
  mastra_vector_indexes: mastraVectorIndexesTable,
  mastra_vectors: mastraVectorsTable,
  mastra_documents: mastraDocumentsTable,
})
