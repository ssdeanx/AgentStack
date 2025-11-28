system

GET
/health

GET
/api

ai-sdk

POST
/chat
Chat with an agent

POST
/workflow
Stream a workflow in AI SDK format

POST
/network
Execute an agent network and stream AI SDK events

agents

GET
/.well-known/{agentId}/agent-card.json

POST
/a2a/{agentId}

GET
/api/agents

GET
/api/agents/providers

GET
/api/agents/{agentId}

GET
/api/agents/{agentId}/evals/ci

GET
/api/agents/{agentId}/evals/live

POST
/api/agents/{agentId}/generate-legacy

POST
/api/agents/{agentId}/generate

POST
/api/agents/{agentId}/network

POST
/api/agents/{agentId}/generate/vnext

POST
/api/agents/{agentId}/stream/vnext

POST
/api/agents/{agentId}/stream-legacy

POST
/api/agents/{agentId}/stream

POST
/api/agents/{agentId}/streamVNext

POST
/api/agents/{agentId}/stream/vnext/ui

POST
/api/agents/{agentId}/stream/ui

POST
/api/agents/{agentId}/model

POST
/api/agents/{agentId}/model/reset

POST
/api/agents/{agentId}/models/reorder

POST
/api/agents/{agentId}/models/{modelConfigId}

GET
/api/agents/{agentId}/speakers

GET
/api/agents/{agentId}/voice/speakers

POST
/api/agents/{agentId}/speak

POST
/api/agents/{agentId}/voice/speak

GET
/api/agents/{agentId}/voice/listener

POST
/api/agents/{agentId}/listen

POST
/api/agents/{agentId}/voice/listen

GET
/api/agents/{agentId}/tools/{toolId}

POST
/api/agents/{agentId}/tools/{toolId}/execute

POST
/api/agents/{agentId}/approve-tool-call

POST
/api/agents/{agentId}/decline-tool-call

POST
/api/agents/{agentId}/instructions

POST
/api/agents/{agentId}/instructions/enhance

mcp

POST
/api/mcp/{serverId}/mcp

GET
/api/mcp/{serverId}/mcp

GET
/api/mcp/{serverId}/sse

POST
/api/mcp/{serverId}/messages

GET
/api/mcp/v0/servers

GET
/api/mcp/v0/servers/{id}

GET
/api/mcp/{serverId}/tools

GET
/api/mcp/{serverId}/tools/{toolId}

POST
/api/mcp/{serverId}/tools/{toolId}/execute

networkMemory

GET
/api/memory/network/status

GET
/api/memory/network/threads

POST
/api/memory/network/threads

GET
/api/memory/network/threads/{threadId}

PATCH
/api/memory/network/threads/{threadId}

DELETE
/api/memory/network/threads/{threadId}

GET
/api/memory/network/threads/{threadId}/messages

POST
/api/memory/network/save-messages

POST
/api/memory/network/messages/delete

memory

GET
/api/memory/status

GET
/api/memory/config

GET
/api/memory/threads

POST
/api/memory/threads

GET
/api/memory/threads/paginated

GET
/api/memory/threads/{threadId}

PATCH
/api/memory/threads/{threadId}

DELETE
/api/memory/threads/{threadId}

GET
/api/memory/threads/{threadId}/messages

GET
/api/memory/threads/{threadId}/messages/paginated

GET
/api/memory/search

GET
/api/memory/threads/{threadId}/working-memory

POST
/api/memory/threads/{threadId}/working-memory

POST
/api/memory/save-messages

POST
/api/memory/messages/delete

telemetry

GET
/api/telemetry

POST
/api/telemetry

observability

GET
/api/observability/traces

GET
/api/observability/traces/{traceId}

POST
/api/observability/traces/score

scores

GET
/api/observability/traces/{traceId}/{spanId}/scores

GET
/api/scores/scorers

GET
/api/scores/scorers/{scorerId}

GET
/api/scores/run/{runId}

GET
/api/scores/scorer/{scorerId}

GET
/api/scores/entity/{entityType}/{entityId}

POST
/api/scores

legacyWorkflows

GET
/api/workflows/legacy

GET
/api/workflows/legacy/{workflowId}

GET
/api/workflows/legacy/{workflowId}/runs

POST
/api/workflows/legacy/{workflowId}/resume
POST
/api/workflows/legacy/{workflowId}/resume-async
POST
/api/workflows/legacy/{workflowId}/create-run
POST
/api/workflows/legacy/{workflowId}/start-async

POST
/api/workflows/legacy/{workflowId}/start

GET
/api/workflows/legacy/{workflowId}/watch

workflows

GET
/api/workflows
GET
/api/workflows/{workflowId}
GET
/api/workflows/{workflowId}/runs
GET
/api/workflows/{workflowId}/runs/{runId}/execution-result
GET
/api/workflows/{workflowId}/runs/{runId}

POST
/api/workflows/{workflowId}/resume
POST
/api/workflows/{workflowId}/resume-stream
POST
/api/workflows/{workflowId}/resume-async
POST
/api/workflows/{workflowId}/stream-legacy
POST
/api/workflows/{workflowId}/observe-stream-legacy
POST
/api/workflows/{workflowId}/streamVNext
POST
/api/workflows/{workflowId}/observe
POST
/api/workflows/{workflowId}/stream
POST
/api/workflows/{workflowId}/observe-streamVNext
POST
/api/workflows/{workflowId}/create-run
POST
/api/workflows/{workflowId}/start-async
POST
/api/workflows/{workflowId}/start

GET
/api/workflows/{workflowId}/watch

POST
/api/workflows/{workflowId}/runs/{runId}/cancel
POST
/api/workflows/{workflowId}/runs/{runId}/send-event

logs

GET
/api/logs
GET
/api/logs/transports
GET
/api/logs/{runId}

agent-builder

GET
/api/agent-builder
GET
/api/agent-builder/{actionId}
GET
/api/agent-builder/{actionId}/runs
GET
/api/agent-builder/{actionId}/runs/{runId}/execution-result
GET
/api/agent-builder/{actionId}/runs/{runId}

POST
/api/agent-builder/{actionId}/resume

POST
/api/agent-builder/{actionId}/resume-async

POST
/api/agent-builder/{actionId}/stream

POST
/api/agent-builder/{actionId}/streamVNext

POST
/api/agent-builder/{actionId}/create-run

POST
/api/agent-builder/{actionId}/start-async

POST
/api/agent-builder/{actionId}/start

GET
/api/agent-builder/{actionId}/watch

POST
/api/agent-builder/{actionId}/runs/{runId}/cancel

POST
/api/agent-builder/{actionId}/runs/{runId}/send-event

tools

GET
/api/tools

GET
/api/tools/{toolId}

POST
/api/tools/{toolId}/execute

vector

POST
/api/vector/{vectorName}/upsert

POST
/api/vector/{vectorName}/create-index

POST
/api/vector/{vectorName}/query

GET
/api/vector/{vectorName}/indexes

GET
/api/vector/{vectorName}/indexes/{indexName}

DELETE
/api/vector/{vectorName}/indexes/{indexName}