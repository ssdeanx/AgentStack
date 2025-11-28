# Mastra Routes API Documentation

Mastra API
 1.0.0
OAS 3.1
/openapi.json
Mastra API

system

GET
/health

Health check endpoint

Parameters
Try it out
No parameters

Responses
Code Description Links
200
Service is healthy

No links

GET
/api

Get API status

Parameters
Try it out
No parameters

Responses
Code Description Links
200
Success

No links
ai-sdk

POST
/chat
Chat with an agent

Send messages to an agent and stream the response in the AI SDK format

Parameters
Try it out
Name Description
agentId *
string
(path)
The ID of the agent to chat with

agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {
      "role": "user",
      "content": "string"
    }
  ]
}
Responses
Code Description Links
200
Streaming response from the agent

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links
400
Bad request - invalid input

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links
404
Agent not found

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links

POST
/workflow
Stream a workflow in AI SDK format

Starts a workflow run and streams events as AI SDK UIMessage chunks

Parameters
Try it out
Name Description
workflowId *
string
(path)
The ID of the workflow to stream

workflowId
Request body

application/json
Example Value
Schema
{
  "runId": "string",
  "resourceId": "string",
  "inputData": {
    "additionalProp1": {}
  },
  "resumeData": {
    "additionalProp1": {}
  },
  "runtimeContext": {
    "additionalProp1": {}
  },
  "tracingOptions": {
    "additionalProp1": {}
  },
  "step": "string"
}
Responses
Code Description Links
200
Workflow UIMessage event stream

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links

POST
/network
Execute an agent network and stream AI SDK events

Routes a request to an agent network and streams UIMessage chunks in AI SDK format

Parameters
Try it out
Name Description
agentId *
string
(path)
The ID of the routing agent to execute as a network

agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "runtimeContext": {
    "additionalProp1": {}
  },
  "runId": "string",
  "maxSteps": 0,
  "threadId": "string",
  "resourceId": "string",
  "modelSettings": {
    "additionalProp1": {}
  },
  "telemetry": {
    "additionalProp1": {}
  },
  "tools": [
    {}
  ]
}
Responses
Code Description Links
200
Streaming AI SDK UIMessage event stream for the agent network

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links
404
Agent not found

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links
agents

GET
/.well-known/{agentId}/agent-card.json

Get agent configuration

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
Agent configuration

No links

POST
/a2a/{agentId}

Execute agent via A2A protocol

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "method": "message/send",
  "params": {
    "id": "string",
    "sessionId": "string",
    "message": {},
    "pushNotification": {},
    "historyLength": 0,
    "metadata": {}
  }
}
Responses
Code Description Links
200
A2A response

No links
400
Missing or invalid request parameters

No links
404
Agent not found

No links

GET
/api/agents

Get all available agents

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all agents

No links

GET
/api/agents/providers

Get all available model providers with connection status

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of model providers with their connection status

No links

GET
/api/agents/{agentId}

Get agent by ID

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
Agent details

No links
404
Agent not found

No links

GET
/api/agents/{agentId}/evals/ci

Get CI evals by agent ID

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
List of evals

No links

GET
/api/agents/{agentId}/evals/live

Get live evals by agent ID

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
List of evals

No links

POST
/api/agents/{agentId}/generate-legacy

Generate a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "threadId": "string",
  "resourceId": "string",
  "runId": "string",
  "output": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
Generated response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/generate

Generate a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "threadId": "string",
  "resourceId": "string",
  "runId": "string",
  "structuredOutput": {
    "schema": {},
    "model": "string",
    "instructions": "string",
    "errorStrategy": "strict",
    "fallbackValue": {}
  },
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
Generated response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/network

Execute an agent as a Network

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "runId": "string",
  "memory": {
    "thread": "string",
    "resource": "string",
    "options": {}
  },
  "modelSettings": {
    "maxTokens": 0,
    "temperature": 1,
    "topP": 1,
    "topK": 0,
    "presencePenalty": -1,
    "frequencyPenalty": -1,
    "stopSequences": [
      "string"
    ],
    "seed": 0,
    "maxRetries": 0,
    "headers": {}
  }
}

POST
/api/agents/{agentId}/generate/vnext

Generate a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "threadId": "string",
  "resourceId": "string",
  "output": {},
  "instructions": "string",
  "context": [
    {}
  ],
  "savePerStep": true,
  "toolChoice": "auto",
  "format": "mastra",
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  },
  "messages": [
    {}
  ],
  "runId": "string",
  "memory": {
    "thread": "string",
    "resource": "string",
    "options": {}
  },
  "modelSettings": {
    "maxTokens": 0,
    "temperature": 1,
    "topP": 1,
    "topK": 0,
    "presencePenalty": -1,
    "frequencyPenalty": -1,
    "stopSequences": [
      "string"
    ],
    "seed": 0,
    "maxRetries": 0,
    "headers": {}
  }
}
Responses
Code Description Links
200
Generated response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/stream/vnext

POST
/api/agents/{agentId}/stream-legacy

Stream a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "threadId": "string",
  "resourceId": "string",
  "runId": "string",
  "output": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
Streamed response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/stream

Stream a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {}
  ],
  "threadId": "string",
  "resourceId": "string",
  "runId": "string",
  "structuredOutput": {
    "schema": {},
    "model": "string",
    "instructions": "string",
    "errorStrategy": "strict",
    "fallbackValue": {}
  },
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
Streamed response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/streamVNext

POST
/api/agents/{agentId}/stream/vnext/ui

POST
/api/agents/{agentId}/stream/ui

Stream a response from an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "threadId": "string",
  "resourceId": "string",
  "output": {},
  "instructions": "string",
  "context": [
    {}
  ],
  "savePerStep": true,
  "toolChoice": "auto",
  "format": "mastra",
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  },
  "messages": [
    {}
  ],
  "runId": "string",
  "memory": {
    "thread": "string",
    "resource": "string",
    "options": {}
  },
  "modelSettings": {
    "maxTokens": 0,
    "temperature": 1,
    "topP": 1,
    "topK": 0,
    "presencePenalty": -1,
    "frequencyPenalty": -1,
    "stopSequences": [
      "string"
    ],
    "seed": 0,
    "maxRetries": 0,
    "headers": {}
  }
}
Responses
Code Description Links
200
Streamed response

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/model

Update the model for an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "modelId": "string",
  "provider": "openai"
}
Responses
Code Description Links
200
Model updated successfully

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/model/reset

Reset the agent model to the original model set during construction

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
Model reset to original successfully

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/models/reorder

Reorder the models for an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "reorderedModelIds": [
    "string"
  ]
}
Responses
Code Description Links
200
Model list reordered successfully

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/models/{modelConfigId}

Update the model for an agent in the model list

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
modelConfigId *
string
(path)
modelConfigId
Request body

application/json
Example Value
Schema
{
  "model": {
    "modelId": "string",
    "provider": "openai"
  },
  "maxRetries": 0,
  "enabled": true
}
Responses
Code Description Links
200
Model updated successfully

No links
404
Agent not found

No links

GET
/api/agents/{agentId}/speakers

[DEPRECATED] Use /api/agents/:agentId/voice/speakers instead. Get available speakers for an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
List of available speakers

Media type

application/json
Controls Accept header.
Example Value
Schema
[
  {
    "voiceId": "string",
    "additionalProp1": {}
  }
]
No links
400
Agent does not have voice capabilities

No links
404
Agent not found

No links

GET
/api/agents/{agentId}/voice/speakers

Get available speakers for an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
List of available speakers

Media type

application/json
Controls Accept header.
Example Value
Schema
[
  {
    "voiceId": "string",
    "additionalProp1": {}
  }
]
No links
400
Agent does not have voice capabilities

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/speak

[DEPRECATED] Use /api/agents/:agentId/voice/speak instead. Convert text to speech using the agent's voice provider

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "text": "string",
  "options": {
    "speaker": "string",
    "additionalProp1": {}
  }
}
Responses
Code Description Links
200
Audio stream

Media type

audio/mpeg
Controls Accept header.
Example Value
Schema
string
No links
400
Agent does not have voice capabilities or invalid request

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/voice/speak

GET
/api/agents/{agentId}/voice/listener

Get available listener for an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Responses
Code Description Links
200
Checks if listener is available for the agent

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "enabled": true,
  "additionalProp1": {}
}
No links
400
Agent does not have voice capabilities

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/listen

[DEPRECATED] Use /api/agents/:agentId/voice/listen instead. Convert speech to text using the agent's voice provider. Additional provider-specific options can be passed as query parameters.

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

audio/mpeg
Example values are not available for audio/mpeg media types.
Responses
Code Description Links
200
Transcription result

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "text": "string"
}
No links
400
Agent does not have voice capabilities or invalid request

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/voice/listen

GET
/api/agents/{agentId}/tools/{toolId}

Get agent tool by ID

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
toolId *
string
(path)
toolId
Responses
Code Description Links
200
Tool details

No links
404
Tool or agent not found

No links

POST
/api/agents/{agentId}/tools/{toolId}/execute

Execute a tool through an agent

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
toolId *
string
(path)
toolId
Request body

application/json
Example Value
Schema
{
  "data": {},
  "runtimeContext": {}
}
Responses
Code Description Links
200
Tool execution result

No links
404
Tool or agent not found

No links

POST
/api/agents/{agentId}/approve-tool-call

Approve a tool call in human-in-the-loop workflow

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "runId": "string",
  "toolCallId": "string",
  "runtimeContext": {},
  "format": "aisdk"
}
Responses
Code Description Links
200
Tool call approved and execution resumed

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/decline-tool-call

Decline a tool call in human-in-the-loop workflow

Parameters
Try it out
Name Description
agentId *
string
(path)
agentId
Request body

application/json
Example Value
Schema
{
  "runId": "string",
  "toolCallId": "string",
  "runtimeContext": {},
  "format": "aisdk"
}
Responses
Code Description Links
200
Tool call declined and execution resumed

No links
404
Agent not found

No links

POST
/api/agents/{agentId}/instructions

POST
/api/agents/{agentId}/instructions/enhance

mcp

POST
/api/mcp/{serverId}/mcp

Send a message to an MCP server using Streamable HTTP

Parameters
Try it out
Name Description
serverId *
string
(path)
serverId
Request body

application/json
Example Value
Schema
{}
Responses
Code Description Links
200
Streamable HTTP connection processed

No links
404
MCP server not found

No links

GET
/api/mcp/{serverId}/mcp

Send a message to an MCP server using Streamable HTTP

Parameters
Try it out
Name Description
serverId *
string
(path)
serverId
Responses
Code Description Links
200
Streamable HTTP connection processed

No links
404
MCP server not found

No links

GET
/api/mcp/{serverId}/sse

Establish an MCP Server-Sent Events (SSE) connection with a server instance.

Parameters
Try it out
Name Description
serverId *
string
(path)
The ID of the MCP server instance.

serverId
Responses
Code Description Links
200
SSE connection established. The client will receive events over this connection. (Content-Type: text/event-stream)

No links
404
MCP server instance not found.

No links
500
Internal server error establishing SSE connection.

No links

POST
/api/mcp/{serverId}/messages

Send a message to an MCP server over an established SSE connection.

Parameters
Try it out
Name Description
serverId *
string
(path)
The ID of the MCP server instance.

serverId
Request body

application/json
JSON-RPC message to send to the MCP server.

Example Value
Schema
{}
Responses
Code Description Links
200
Message received and is being processed by the MCP server. The actual result or error will be sent as an SSE event over the established connection.

No links
400
Bad request (e.g., invalid JSON payload or missing body).

No links
404
MCP server instance not found or SSE connection path incorrect.

No links
503
SSE connection not established with this server, or server unable to process message.

No links

GET
/api/mcp/v0/servers

List all available MCP server instances with basic information.

Parameters
Try it out
Name Description
limit
integer
(query)
Number of results per page.

Default value : 50

50
offset
integer
(query)
Number of results to skip for pagination.

Default value : 0

0
Responses
Code Description Links
200
A list of MCP server instances.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "servers": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "repository": {
        "url": "string",
        "source": "github",
        "id": "string"
      },
      "version_detail": {
        "version": "string",
        "release_date": "string",
        "is_latest": true
      }
    }
  ],
  "next": "https://example.com/",
  "total_count": 0
}
No links

GET
/api/mcp/v0/servers/{id}

Get detailed information about a specific MCP server instance.

Parameters
Try it out
Name Description
id *
string
(path)
Unique ID of the MCP server instance.

id
version
string
(query)
Desired MCP server version (currently informational, server returns its actual version).

version
Responses
Code Description Links
200
Detailed information about the MCP server instance.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "string",
  "name": "string",
  "description": "string",
  "repository": {
    "url": "string",
    "source": "string",
    "id": "string"
  },
  "version_detail": {
    "version": "string",
    "release_date": "string",
    "is_latest": true
  },
  "package_canonical": "string",
  "packages": [
    {
      "registry_name": "string",
      "name": "string",
      "version": "string",
      "command": {
        "name": "string",
        "subcommands": [
          {
            "name": "string",
            "description": "string",
            "is_required": true,
            "subcommands": [
              {}
            ],
            "positional_arguments": [
              {}
            ],
            "named_arguments": [
              {}
            ]
          }
        ],
        "positional_arguments": [
          {}
        ],
        "named_arguments": [
          {}
        ]
      },
      "environment_variables": [
        {
          "name": "string",
          "description": "string",
          "required": true,
          "default_value": "string"
        }
      ]
    }
  ],
  "remotes": [
    {
      "transport_type": "string",
      "url": "string"
    }
  ]
}
No links
404
MCP server instance not found.

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links

GET
/api/mcp/{serverId}/tools

GET
/api/mcp/{serverId}/tools/{toolId}

POST
/api/mcp/{serverId}/tools/{toolId}/execute

networkMemory

GET
/api/memory/network/status

Get network memory status

Parameters
Try it out
Name Description
networkId *
string
(query)
networkId
Responses
Code Description Links
200
Memory status

No links

GET
/api/memory/network/threads

Get all threads

Parameters
Try it out
Name Description
resourceid *
string
(query)
resourceid
networkId *
string
(query)
networkId
orderBy
string
(query)
Field to sort by

Available values : createdAt, updatedAt

Default value : createdAt

createdAt
sortDirection
string
(query)
Sort direction

Available values : ASC, DESC

Default value : DESC

DESC
Responses
Code Description Links
200
List of all threads

No links

POST
/api/memory/network/threads

Create a new thread

Parameters
Try it out
Name Description
networkId *
string
(query)
networkId
Request body

application/json
Example Value
Schema
{
  "title": "string",
  "metadata": {},
  "resourceId": "string",
  "threadId": "string"
}
Responses
Code Description Links
200
Created thread

No links

GET
/api/memory/network/threads/{threadId}

Get thread by ID

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
networkId *
string
(query)
networkId
Responses
Code Description Links
200
Thread details

No links
404
Thread not found

No links

PATCH
/api/memory/network/threads/{threadId}

DELETE
/api/memory/network/threads/{threadId}

Delete a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
networkId *
string
(query)
networkId
Responses
Code Description Links
200
Thread deleted

No links
404
Thread not found

No links

GET
/api/memory/network/threads/{threadId}/messages

Get messages for a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
networkId *
string
(query)
networkId
limit
number
(query)
Limit the number of messages to retrieve (default: 40)

limit
Responses
Code Description Links
200
List of messages

No links

POST
/api/memory/network/save-messages

Save messages

Parameters
Try it out
Name Description
networkId *
string
(query)
networkId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "role": "user",
      "type": "text",
      "createdAt": "2025-11-28T14:16:14.594Z",
      "threadId": "string",
      "resourceId": "string"
    },
    {
      "id": "string",
      "role": "user",
      "createdAt": "2025-11-28T14:16:14.594Z",
      "threadId": "string",
      "resourceId": "string",
      "content": {
        "format": 2,
        "parts": [
          {}
        ],
        "content": "string",
        "toolInvocations": [
          {}
        ],
        "experimental_attachments": [
          {}
        ]
      }
    }
  ]
}
Responses
Code Description Links
200
Messages saved

No links

POST
/api/memory/network/messages/delete

Delete one or more messages

Parameters
Try it out
Name Description
networkId *
string
(query)
networkId
Request body

application/json
Example Value
Schema
{
  "messageIds": "string"
}
Responses
Code Description Links
200
Messages deleted successfully

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "success": true,
  "message": "string"
}
No links
memory

GET
/api/memory/status

GET
/api/memory/config

Get memory configuration

Parameters
Try it out
Name Description
agentId *
string
(query)
agentId
Responses
Code Description Links
200
Memory configuration

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "config": {
    "lastMessages": 0,
    "semanticRecall": true,
    "workingMemory": {
      "enabled": true,
      "scope": "thread",
      "template": "string"
    },
    "threads": {
      "generateTitle": true
    }
  }
}
No links

GET
/api/memory/threads

Get all threads

Parameters
Try it out
Name Description
resourceid *
string
(query)
resourceid
agentId *
string
(query)
agentId
orderBy
string
(query)
Field to sort by

Available values : createdAt, updatedAt

Default value : createdAt

createdAt
sortDirection
string
(query)
Sort direction

Available values : ASC, DESC

Default value : DESC

DESC
Responses
Code Description Links
200
List of all threads

No links

POST
/api/memory/threads

Create a new thread

Parameters
Try it out
Name Description
agentId *
string
(query)
agentId
Request body

application/json
Example Value
Schema
{
  "title": "string",
  "metadata": {},
  "resourceId": "string",
  "threadId": "string"
}
Responses
Code Description Links
200
Created thread

No links

GET
/api/memory/threads/paginated

Get paginated threads

Parameters
Try it out
Name Description
resourceId *
string
(query)
resourceId
agentId *
string
(query)
agentId
page
number
(query)
Page number

Default value : 0

0
perPage
number
(query)
Number of threads per page

Default value : 100

100
orderBy
string
(query)
Available values : createdAt, updatedAt

Default value : createdAt

createdAt
sortDirection
string
(query)
Available values : ASC, DESC

Default value : DESC

DESC
Responses
Code Description Links
200
Paginated list of threads

No links

GET
/api/memory/threads/{threadId}

Get thread by ID

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
Responses
Code Description Links
200
Thread details

No links
404
Thread not found

No links

PATCH
/api/memory/threads/{threadId}

Update a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
Request body

application/json
Example Value
Schema
{}
Responses
Code Description Links
200
Updated thread

No links
404
Thread not found

No links

DELETE
/api/memory/threads/{threadId}

Delete a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
Responses
Code Description Links
200
Thread deleted

No links
404
Thread not found

No links

GET
/api/memory/threads/{threadId}/messages

Get messages for a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
limit
number
(query)
Limit the number of messages to retrieve (default: 40)

limit
Responses
Code Description Links
200
List of messages

No links

GET
/api/memory/threads/{threadId}/messages/paginated

Get paginated messages for a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
The unique identifier of the thread

threadId
resourceId
string
(query)
Filter messages by resource ID

resourceId
format
string
(query)
Message format to return

Available values : v1, v2

Default value : v1

v1
selectBy
string
(query)
JSON string containing selection criteria for messages

{"pagination":{"page":0,"perPage":20,"dateRange":{"start":"2024-01-01T00:00:00Z","end":"2024-12-31T23:59:59Z"}},"include":[{"id":"msg-123","withPreviousMessages":5,"withNextMessages":3}]}
Responses
Code Description Links
200
List of messages

No links

GET
/api/memory/search

Search messages in a thread

Parameters
Try it out
Name Description
searchQuery *
string
(query)
The text to search for

searchQuery
resourceId *
string
(query)
The resource ID (user/org) to validate thread ownership

resourceId
threadId
string
(query)
The thread ID to search within (optional - searches all threads if not provided)

threadId
agentId *
string
(query)
The agent ID

agentId
limit
number
(query)
Maximum number of results to return (default: 20)

limit
memoryConfig
string
(query)
JSON-encoded memory configuration (e.g., {"lastMessages": 0} for semantic-only search)

memoryConfig
Responses
Code Description Links
200
Search results

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "results": [
    {
      "id": "string",
      "role": "string",
      "content": "string",
      "createdAt": "string"
    }
  ],
  "count": 0,
  "query": "string"
}
No links
400
Bad request

No links
403
Thread does not belong to the specified resource

No links
404
Thread not found

No links

GET
/api/memory/threads/{threadId}/working-memory

Get working memory for a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
resourceId
string
(query)
resourceId
Responses
Code Description Links
200
Working memory details

No links
404
Thread not found

No links

POST
/api/memory/threads/{threadId}/working-memory

Update working memory for a thread

Parameters
Try it out
Name Description
threadId *
string
(path)
threadId
agentId *
string
(query)
agentId
Request body

application/json
Example Value
Schema
{
  "workingMemory": "string",
  "resourceId": "string"
}
Responses
Code Description Links
200
Working memory updated successfully

No links
404
Thread not found

No links

POST
/api/memory/save-messages

Save messages

Parameters
Try it out
Name Description
agentId *
string
(query)
agentId
Request body

application/json
Example Value
Schema
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "role": "user",
      "type": "text",
      "createdAt": "2025-11-28T14:16:14.646Z",
      "threadId": "string",
      "resourceId": "string"
    },
    {
      "id": "string",
      "role": "user",
      "createdAt": "2025-11-28T14:16:14.646Z",
      "threadId": "string",
      "resourceId": "string",
      "content": {
        "format": 2,
        "parts": [
          {}
        ],
        "content": "string",
        "toolInvocations": [
          {}
        ],
        "experimental_attachments": [
          {}
        ]
      }
    }
  ]
}
Responses
Code Description Links
200
Messages saved

No links

POST
/api/memory/messages/delete

Delete one or more messages

Parameters
Try it out
Name Description
agentId *
string
(query)
agentId
Request body

application/json
Example Value
Schema
{
  "messageIds": "string"
}
Responses
Code Description Links
200
Messages deleted successfully

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "success": true,
  "message": "string"
}
No links
telemetry

GET
/api/telemetry

Get all traces

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all traces (paged)

No links

POST
/api/telemetry

Store telemetry

Parameters
Try it out
No parameters

Responses
Code Description Links
200
Traces stored

No links
observability

GET
/api/observability/traces

Get paginated list of AI traces

Parameters
Try it out
Name Description
page
number
(query)
Page number for pagination (default: 0)

page
perPage
number
(query)
Number of items per page (default: 10)

perPage
name
string
(query)
Filter traces by name

name
spanType
number
(query)
Filter traces by span type

spanType
dateRange
string
(query)
JSON string with start and end dates for filtering

dateRange
attributes
string
(query)
JSON string with attributes to filter by

attributes
Responses
Code Description Links
200
Paginated list of AI traces

No links
400
Bad request - invalid parameters

No links

GET
/api/observability/traces/{traceId}

Get a specific AI trace by ID

Parameters
Try it out
Name Description
traceId *
string
(path)
The ID of the trace to retrieve

traceId
Responses
Code Description Links
200
AI trace with all its spans

No links
400
Bad request - missing trace ID

No links
404
Trace not found

No links

POST
/api/observability/traces/score

Score traces using a specified scorer

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "scorerName": "relevance-scorer",
  "targets": [
    {
      "traceId": "trace-123",
      "spanId": "span-456"
    }
  ]
}
Responses
Code Description Links
200
Scoring initiated successfully

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "status": "success",
  "message": "Scoring started for 3 traces",
  "traceCount": 3
}
No links
400
Bad request - invalid parameters

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links
404
Scorer not found

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links
500
Internal server error

Media type

application/json
Example Value
Schema
{
  "error": "string"
}
No links
scores

GET
/api/observability/traces/{traceId}/{spanId}/scores

Get scores by trace ID and span ID

Parameters
Try it out
Name Description
traceId *
string
(path)
Trace ID

traceId
spanId *
string
(path)
Span ID

spanId
page
number
(query)
Page number for pagination (default: 0)

page
perPage
number
(query)
Number of items per page (default: 10)

perPage
Responses
Code Description Links
200
Paginated list of scores for span

No links

GET
/api/scores/scorers

Get all scorers

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all scorers

No links

GET
/api/scores/scorers/{scorerId}

Get a scorer by ID

Parameters
Try it out
Name Description
scorerId *
string
(path)
scorerId
Responses
Code Description Links
200
Scorer details

No links

GET
/api/scores/run/{runId}

Get scores by run ID

Parameters
Try it out
Name Description
runId *
string
(path)
runId
page
number
(query)
Page number for pagination (default: 0)

page
perPage
number
(query)
Number of items per page (default: 10)

perPage
Responses
Code Description Links
200
Paginated list of scores for run ID

No links

GET
/api/scores/scorer/{scorerId}

Get scores by scorer ID

Parameters
Try it out
Name Description
scorerId *
string
(path)
scorerId
page
number
(query)
Page number for pagination (default: 0)

page
perPage
number
(query)
Number of items per page (default: 10)

perPage
Responses
Code Description Links
200
Paginated list of scores for run ID

No links

GET
/api/scores/entity/{entityType}/{entityId}

Get scores by entity ID and type

Parameters
Try it out
Name Description
entityType *
string
(path)
Type of entity (e.g., agent, workflow, tool)

entityType
entityId *
string
(path)
ID of the entity

entityId
page
number
(query)
Page number for pagination (default: 0)

page
perPage
number
(query)
Number of items per page (default: 10)

perPage
Responses
Code Description Links
200
Paginated list of scores for entity

No links

POST
/api/scores

Save a score

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "id": "string",
  "runId": "string",
  "scorer": {},
  "result": {},
  "input": {},
  "output": {},
  "source": "string",
  "entityType": "string",
  "entity": {},
  "metadata": {},
  "additionalLLMContext": {},
  "runtimeContext": {},
  "resourceId": "string",
  "threadId": "string",
  "traceId": "string"
}
Responses
Code Description Links
200
Score saved successfully

No links
400
Invalid score data

No links
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

Get all workflows

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all workflows

No links

GET
/api/workflows/{workflowId}

Get workflow by ID

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
Responses
Code Description Links
200
Workflow details

No links
404
Workflow not found

No links

GET
/api/workflows/{workflowId}/runs

Get all runs for a workflow

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
fromDate
string($date-time)
(query)
fromDate
toDate
string($date-time)
(query)
toDate
limit
number
(query)
limit
offset
number
(query)
offset
resourceId
string
(query)
resourceId
Responses
Code Description Links
200
List of workflow runs from storage

No links

GET
/api/workflows/{workflowId}/runs/{runId}/execution-result

Get execution result for a workflow run

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(path)
runId
Responses
Code Description Links
200
Workflow run execution result

No links
404
Workflow run execution result not found

No links

GET
/api/workflows/{workflowId}/runs/{runId}

Get workflow run by ID

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(path)
runId
Responses
Code Description Links
200
Workflow run by ID

No links
404
Workflow run not found

No links

POST
/api/workflows/{workflowId}/resume

Resume a suspended workflow step

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "step": "string",
  "resumeData": {},
  "runtimeContext": {}
}

POST
/api/workflows/{workflowId}/resume-stream

Resume a suspended workflow that uses streamVNext

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "step": "string",
  "resumeData": {},
  "runtimeContext": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}

POST
/api/workflows/{workflowId}/resume-async

Resume a suspended workflow step

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "step": "string",
  "resumeData": {},
  "runtimeContext": {}
}

POST
/api/workflows/{workflowId}/stream-legacy

Stream legacy workflow in real-time

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
workflow run started

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/observe-stream-legacy

Observe workflow stream in real-time

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Responses
Code Description Links
200
workflow stream observed

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/streamVNext

Stream workflow in real-time using the VNext streaming API

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {},
  "closeOnSuspend": true,
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
workflow run started

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/observe

Observe workflow stream in real-time using the streaming API

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Responses
Code Description Links
200
workflow stream observed

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/stream

Stream workflow in real-time using the streaming API

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {},
  "closeOnSuspend": true,
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
workflow run started

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/observe-streamVNext

Observe workflow stream in real-time using the VNext streaming API

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Responses
Code Description Links
200
workflow stream vNext observed

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/create-run

Create a new workflow run

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Responses
Code Description Links
200
New workflow run created

No links

POST
/api/workflows/{workflowId}/start-async

Execute/Start a workflow

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
workflow execution result

No links
404
workflow not found

No links

POST
/api/workflows/{workflowId}/start

Start an existing workflow run

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {},
  "tracingOptions": {
    "metadata": {
      "additionalProp1": {}
    }
  }
}
Responses
Code Description Links
200
workflow run started

No links
404
workflow not found

No links

GET
/api/workflows/{workflowId}/watch

Watch workflow transitions in real-time

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId
string
(query)
runId
Responses
Code Description Links
200
workflow transitions in real-time

No links

POST
/api/workflows/{workflowId}/runs/{runId}/cancel

Cancel a workflow run

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(path)
runId
Responses
Code Description Links
200
workflow run cancelled

No links

POST
/api/workflows/{workflowId}/runs/{runId}/send-event

Send an event to a workflow run

Parameters
Try it out
Name Description
workflowId *
string
(path)
workflowId
runId *
string
(path)
runId
Request body

application/json
Example Value
Schema
{
  "event": "string",
  "data": {}
}
Responses
Code Description Links
200
workflow run event sent

No links
logs

GET
/api/logs

Get all logs

Parameters
Try it out
Name Description
transportId *
string
(query)
transportId
fromDate
string
(query)
fromDate
toDate
string
(query)
toDate
logLevel
string
(query)
logLevel
filters
string
(query)
filters
page
number
(query)
page
perPage
number
(query)
perPage
Responses
Code Description Links
200
Paginated list of all logs

No links

GET
/api/logs/transports

List of all log transports

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all log transports

No links

GET
/api/logs/{runId}

Get logs by run ID

Parameters
Try it out
Name Description
runId *
string
(path)
runId
transportId *
string
(query)
transportId
fromDate
string
(query)
fromDate
toDate
string
(query)
toDate
logLevel
string
(query)
logLevel
filters
string
(query)
filters
page
number
(query)
page
perPage
number
(query)
perPage
Responses
Code Description Links
200
Paginated list of logs for run ID

No links
agent-builder

GET
/api/agent-builder

Get all agent builder actions

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all agent builder actions

No links

GET
/api/agent-builder/{actionId}

Get agent builder action by ID

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
Responses
Code Description Links
200
Agent builder action details

No links
404
Agent builder action not found

No links

GET
/api/agent-builder/{actionId}/runs

Get all runs for an agent builder action

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
fromDate
string($date-time)
(query)
fromDate
toDate
string($date-time)
(query)
toDate
limit
number
(query)
limit
offset
number
(query)
offset
resourceId
string
(query)
resourceId
Responses
Code Description Links
200
List of agent builder action runs from storage

No links

GET
/api/agent-builder/{actionId}/runs/{runId}/execution-result

Get execution result for an agent builder action run

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(path)
runId
Responses
Code Description Links
200
Agent builder action run execution result

No links
404
Agent builder action run execution result not found

No links

GET
/api/agent-builder/{actionId}/runs/{runId}

Get agent builder action run by ID

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(path)
runId
Responses
Code Description Links
200
Agent builder action run by ID

No links
404
Agent builder action run not found

No links

POST
/api/agent-builder/{actionId}/resume

Resume a suspended agent builder action step

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "step": "string",
  "resumeData": {},
  "runtimeContext": {}
}

POST
/api/agent-builder/{actionId}/resume-async

Resume a suspended agent builder action step

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "step": "string",
  "resumeData": {},
  "runtimeContext": {}
}

POST
/api/agent-builder/{actionId}/stream

Stream agent builder action in real-time

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {}
}
Responses
Code Description Links
200
agent builder action run started

No links
404
agent builder action not found

No links

POST
/api/agent-builder/{actionId}/streamVNext

Stream agent builder action in real-time using the VNext streaming API

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {}
}
Responses
Code Description Links
200
agent builder action run started

No links
404
agent builder action not found

No links

POST
/api/agent-builder/{actionId}/create-run

Create a new agent builder action run

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId
string
(query)
runId
Responses
Code Description Links
200
New agent builder action run created

No links

POST
/api/agent-builder/{actionId}/start-async

POST
/api/agent-builder/{actionId}/start

Create and start a new agent builder action run

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "inputData": {},
  "runtimeContext": {}
}
Responses
Code Description Links
200
agent builder action run started

No links
404
agent builder action not found

No links

GET
/api/agent-builder/{actionId}/watch

Watch agent builder action transitions in real-time

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId
string
(query)
runId
eventType
string
(query)
Available values : watch, watch-v2

--
Responses
Code Description Links
200
agent builder action transitions in real-time

No links

POST
/api/agent-builder/{actionId}/runs/{runId}/cancel

Cancel an agent builder action run

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(path)
runId
Responses
Code Description Links
200
agent builder action run cancelled

No links

POST
/api/agent-builder/{actionId}/runs/{runId}/send-event

Send an event to an agent builder action run

Parameters
Try it out
Name Description
actionId *
string
(path)
actionId
runId *
string
(path)
runId
Request body

application/json
Example Value
Schema
{
  "event": "string",
  "data": {}
}
Responses
Code Description Links
200
agent builder action run event sent

No links
tools

GET
/api/tools

Get all tools

Parameters
Try it out
No parameters

Responses
Code Description Links
200
List of all tools

No links

GET
/api/tools/{toolId}

Get tool by ID

Parameters
Try it out
Name Description
toolId *
string
(path)
toolId
Responses
Code Description Links
200
Tool details

No links
404
Tool not found

No links

POST
/api/tools/{toolId}/execute

Execute a tool

Parameters
Try it out
Name Description
toolId *
string
(path)
toolId
runId
string
(query)
runId
Request body

application/json
Example Value
Schema
{
  "data": {},
  "runtimeContext": {}
}
Responses
Code Description Links
200
Tool execution result

No links
404
Tool not found

No links
vector

POST
/api/vector/{vectorName}/upsert

Upsert vectors into an index

Parameters
Try it out
Name Description
vectorName *
string
(path)
vectorName
Request body

application/json
Example Value
Schema
{
  "indexName": "string",
  "vectors": [
    [
      0
    ]
  ],
  "metadata": [
    {}
  ],
  "ids": [
    "string"
  ]
}
Responses
Code Description Links
200
Vectors upserted successfully

No links

POST
/api/vector/{vectorName}/create-index

Create a new vector index

Parameters
Try it out
Name Description
vectorName *
string
(path)
vectorName
Request body

application/json
Example Value
Schema
{
  "indexName": "string",
  "dimension": 0,
  "metric": "cosine"
}
Responses
Code Description Links
200
Index created successfully

No links

POST
/api/vector/{vectorName}/query

Query vectors from an index

Parameters
Name Description
vectorName *
string
(path)
vectorName
Request body

application/json
Example Value
Schema
{
  "indexName": "string",
  "queryVector": [
    0
  ],
  "topK": 0,
  "filter": {},
  "includeVector": true
}
Responses
Code Description Links
20
Query results

GET
/api/vector/{vectorName}/indexes

List all indexes for a vector store

Parameters
Name Description
vectorName *
string
(path)
vectorName
Responses
Code Description Links
200
List of indexes

GET
/api/vector/{vectorName}/indexes/{indexName}

Get details about a specific index

Parameters
Name Description
vectorName *
string
(path)
vectorName
indexName *
string
(path)
indexName
Responses
Code Description Links
200
Index details

DELETE
/api/vector/{vectorName}/indexes/{indexName}

Delete a specific index

Parameters
Name Description
vectorName *
string
(path)
vectorName
indexName *
string
(path)
indexName
Responses
Code Description Links
200
Index deleted successfully
