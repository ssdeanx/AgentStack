# Context: Coding Team Network & Agents

## Phase: PLANNING (Spec Complete)

## Session: 2025-12-05

### Summary

Researched Mastra's network and A2A patterns using official docs and examples. Analyzed existing implementations in the project (businessLegalAgents.ts, dataPipelineNetwork.ts, a2aCoordinatorAgent.ts). Created comprehensive spec documents (PRD, Design, Tasks) for a multi-agent coding team.

### Key Findings

#### How Mastra Networks Work
1. **Agent Networks** are routing agents with sub-agents, workflows, and tools
2. Use `agent.network()` method for LLM-based multi-primitive orchestration
3. Memory is **required** for network capabilities
4. Routing is based on agent/workflow/tool descriptions and input schemas
5. Networks emit streaming events for progress tracking

#### How A2A Works
1. **A2A Protocol** enables agent-to-agent communication
2. Exposed via MCP server for external access
3. Supports parallel orchestration using `Promise.all()` patterns
4. Uses `sendMessage()` API returning tasks with status tracking
5. Agents coordinate via message parts (text, data)

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tool: Multi-edit | Atomic with backup | Safety for batch file operations |
| Tool: Code analysis | Regex-based (no AST) | Simpler, language-agnostic |
| Test framework | Vitest only | Project standard |
| Model selection | googleAI3 for complex tasks | Following businessLegalAgents pattern |
| New packages | `diff`, `glob` | Minimal additions, specific needs |

### Architecture Confirmed

```
codingTeamNetwork (Router)
    ├── codeArchitectAgent
    ├── codeReviewerAgent
    ├── testEngineerAgent
    └── refactoringAgent

codingA2ACoordinator (Parallel Orchestrator)
    └── Coordinates all 4 agents for complex tasks
```

### Required Packages

**New Dependencies:**
```json
{
  "diff": "^7.0.0",
  "glob": "^11.0.0"
}
```

**Existing Packages to Leverage:**
- `fs-extra` - Already in project for file operations
- `execa` - Already in project for shell commands (execaTool)
- `zod` - Schema validation (core dependency)
- `@mastra/core` - Agent, createTool, network APIs

### Files to Create

| File | Purpose |
|------|---------|
| `src/mastra/tools/multi-string-edit.tool.ts` | Batch file editing |
| `src/mastra/tools/code-analysis.tool.ts` | Static analysis |
| `src/mastra/tools/test-generator.tool.ts` | Vitest scaffolds |
| `src/mastra/tools/diff-review.tool.ts` | Unified diff generation |
| `src/mastra/tools/code-search.tool.ts` | Pattern searching |
| `src/mastra/agents/codingAgents.ts` | 4 coding agents |
| `src/mastra/networks/codingTeamNetwork.ts` | Network router |
| `src/mastra/a2a/codingA2ACoordinator.ts` | A2A coordinator |

### Blockers

- None identified

### Open Questions

- [ ] Should multi-string-edit support undo/rollback?
- [ ] Maximum file size for code analysis?
- [ ] Rate limiting for GitHub API calls?

### Next Steps

1. User approval of spec
2. Start Phase 1: Implement core tools (CODE-1 through CODE-5)
3. Phase 2: Implement agents (CODE-6 through CODE-9)
4. Phase 3: Network & A2A (CODE-10, CODE-11)
5. Phase 4: Integration & docs (CODE-12, CODE-13)

---

## References

- [Mastra Networks Docs](agents/networks.mdx)
- [Agent.network() Reference](reference/agents/network.mdx)
- [A2A Example](examples/a2a)
- [businessLegalAgents.ts](src/mastra/agents/businessLegalAgents.ts)
- [dataPipelineNetwork.ts](src/mastra/networks/dataPipelineNetwork.ts)
- [a2aCoordinatorAgent.ts](src/mastra/a2a/a2aCoordinatorAgent.ts)

