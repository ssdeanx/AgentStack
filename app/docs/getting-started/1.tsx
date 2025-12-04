import { DocsLayout } from "@/app/components/docs-layout"

export const metadata = {
  title: "Getting Started | AgentStack",
  description: "Learn how to set up and start building with AgentStack",
}

export default function GettingStartedPage() {
  return (
    <DocsLayout
      title="Getting Started"
      description="Learn how to set up and start building with AgentStack"
      section="Getting Started"
    >
      <div className="[&>*]:mb-6">
        {/* This content will be replaced with actual MDX processing */}
        <p>Welcome to AgentStack! This guide will help you get started with building AI applications.</p>

        <h2>Installation</h2>
        <p>First, install the AgentStack CLI:</p>
        <pre><code>npm install -g @mastra/cli</code></pre>

        <h2>Features</h2>
        <p>AgentStack supports:</p>
        <ul>
          <li>✅ Multi-agent orchestration</li>
          <li>✅ RAG pipelines with PgVector</li>
          <li>✅ 30+ enterprise tools</li>
          <li>✅ Real-time observability</li>
        </ul>

        <h2>Tables</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Agents</td>
              <td>✅</td>
              <td>Multi-agent orchestration</td>
            </tr>
            <tr>
              <td>Tools</td>
              <td>✅</td>
              <td>30+ enterprise integrations</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocsLayout>
  )
}