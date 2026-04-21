import { CloudflareKVStorage } from '@mastra/cloudflare/kv'
import { D1Store } from '@mastra/cloudflare-d1'
import { Mastra } from '@mastra/core'
import { CloudflareDeployer } from '@mastra/deployer-cloudflare'
import { FilesystemStore, MastraCompositeStore } from '@mastra/core/storage'
import { duckStore } from './duckdb'

type Env = {
  D1Database: D1Database // TypeScript type definition
}

// Factory function to create Mastra with D1 binding
function createMastra(env: Env) {
  const storage = new D1Store({
    binding: env.D1Database, // ✅ Access the actual binding from env
    tablePrefix: 'dev_', // Optional: isolate tables per environment
  })

  return new Mastra({
    storage,
    deployer: new CloudflareDeployer({
      name: 'my-worker',
      d1_databases: [
        {
          binding: 'D1Database', // Must match the property name in Env type
          database_name: 'your-database-name',
          database_id: 'your-database-id',
        },
      ],
    }),
  })
}

// --- Example 1: Using Workers Binding ---
const storageWorkers = new CloudflareKVStorage({
  id: 'cloudflare-workers-storage',
  bindings: {
    threads: THREADS_KV, // KVNamespace binding for threads table
    messages: MESSAGES_KV, // KVNamespace binding for messages table
    // Add other tables as needed
  },
  keyPrefix: 'dev_', // Optional: isolate keys per environment
})

// --- Example 2: Using REST API ---
const cloudflareKVStorage = new CloudflareKVStorage({
  id: 'cloudflare-kv-storage',
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!, // Cloudflare Account ID
  apiToken: process.env.CLOUDFLARE_API_TOKEN!, // Cloudflare API Token
  namespacePrefix: 'dev_', // Optional: isolate namespaces per environment
})

const cloudflareComposite = new MastraCompositeStore({
  id: 'composite',
    default: cloudflareKVStorage,
    editor: new FilesystemStore({ dir: '.cloudflareKV-storage' }),
        domains: {
          //memory: new MemoryLibSQL({ url: 'file:./local.db' }),
          observability: duckStore.observability,
        }
})