import { ConvexStore, ConvexVector } from '@mastra/convex'

const storage = new ConvexStore({
    id: 'convex-storage',
    deploymentUrl: process.env.CONVEX_URL!,
    adminAuthToken: process.env.CONVEX_ADMIN_KEY!,
})

const vectorStore = new ConvexVector({
    id: 'convex-vectors',
    deploymentUrl: 'https://your-project.convex.cloud',
    adminAuthToken: 'your-admin-token',
})
