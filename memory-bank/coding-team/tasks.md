# Tasks: Coding Team Network & Agents

## Phase 1: Core Tools

### CODE-1: Multi-String Edit Tool
**Description**: Create a tool that applies multiple string replacements across files atomically with backup support.
**Acceptance Criteria**:
- GIVEN an array of edit operations with file paths and old/new strings
- WHEN the tool executes
- THEN all edits are applied atomically, with backups created if enabled
**Files**: 
- `src/mastra/tools/multi-string-edit.tool.ts` (new)
- `src/mastra/tools/tests/multi-string-edit.test.ts` (new)
- `src/mastra/tools/index.ts` (update exports)
**Dependencies**: None
**Effort**: M
**Verification**: `npx vitest -t "multi-string-edit"`

### CODE-2: Code Analysis Tool
**Description**: Create a tool for basic static code analysis (complexity, LOC, pattern detection).
**Acceptance Criteria**:
- GIVEN file paths or code content
- WHEN the tool analyzes the code
- THEN it returns metrics (LOC, complexity estimate) and identified issues
**Files**:
- `src/mastra/tools/code-analysis.tool.ts` (new)
- `src/mastra/tools/tests/code-analysis.test.ts` (new)
**Dependencies**: None
**Effort**: M
**Verification**: `npx vitest -t "code-analysis"`

### CODE-3: Test Generator Tool
**Description**: Create a tool that generates Vitest test scaffolds from source code.
**Acceptance Criteria**:
- GIVEN source code or function signatures
- WHEN the tool generates tests
- THEN it produces syntactically valid Vitest test files
**Files**:
- `src/mastra/tools/test-generator.tool.ts` (new)
- `src/mastra/tools/tests/test-generator.test.ts` (new)
**Dependencies**: None
**Effort**: M
**Verification**: `npx vitest -t "test-generator"`

### CODE-4: Diff Review Tool
**Description**: Create a tool that generates and analyzes unified diffs between code versions.
**Acceptance Criteria**:
- GIVEN original and modified code
- WHEN the tool compares them
- THEN it produces a unified diff with line-by-line analysis
**Files**:
- `src/mastra/tools/diff-review.tool.ts` (new)
- `src/mastra/tools/tests/diff-review.test.ts` (new)
**Dependencies**: `diff` package
**Effort**: S
**Verification**: `npx vitest -t "diff-review"`

### CODE-5: Code Search Tool
**Description**: Create a tool for searching code patterns across files using regex.
**Acceptance Criteria**:
- GIVEN a search pattern and file glob
- WHEN the tool searches
- THEN it returns matching lines with file locations
**Files**:
- `src/mastra/tools/code-search.tool.ts` (new)
- `src/mastra/tools/tests/code-search.test.ts` (new)
**Dependencies**: `glob` package
**Effort**: S
**Verification**: `npx vitest -t "code-search"`

---

## Phase 2: Coding Agents

### CODE-6: Code Architect Agent
**Description**: Create an agent specialized in code architecture and design decisions.
**Acceptance Criteria**:
- GIVEN a feature request or codebase context
- WHEN the agent analyzes
- THEN it proposes architecture, patterns, and implementation approach
**Files**:
- `src/mastra/agents/codingAgents.ts` (new - contains all coding agents)
**Dependencies**: CODE-1, CODE-2, CODE-5
**Effort**: M
**Verification**: Manual test via Mastra Studio

### CODE-7: Code Reviewer Agent
**Description**: Create an agent that reviews code for quality, security, and best practices.
**Acceptance Criteria**:
- GIVEN code or file paths
- WHEN the agent reviews
- THEN it provides categorized feedback (security, performance, style)
**Files**:
- `src/mastra/agents/codingAgents.ts` (update)
**Dependencies**: CODE-2, CODE-4
**Effort**: M
**Verification**: Manual test via Mastra Studio

### CODE-8: Test Engineer Agent
**Description**: Create an agent that generates and reviews tests.
**Acceptance Criteria**:
- GIVEN source code
- WHEN the agent generates tests
- THEN it creates comprehensive Vitest tests with edge cases
**Files**:
- `src/mastra/agents/codingAgents.ts` (update)
**Dependencies**: CODE-3, CODE-2
**Effort**: M
**Verification**: Manual test via Mastra Studio

### CODE-9: Refactoring Agent
**Description**: Create an agent specialized in safe code refactoring.
**Acceptance Criteria**:
- GIVEN code with identified issues
- WHEN the agent proposes refactoring
- THEN it provides step-by-step changes with before/after
**Files**:
- `src/mastra/agents/codingAgents.ts` (update)
**Dependencies**: CODE-1, CODE-2, CODE-4
**Effort**: M
**Verification**: Manual test via Mastra Studio

---

## Phase 3: Network & Coordination

### CODE-10: Coding Team Network
**Description**: Create a routing network that delegates coding requests to appropriate agents.
**Acceptance Criteria**:
- GIVEN a user coding request
- WHEN the network analyzes intent
- THEN it routes to the correct specialist agent
**Files**:
- `src/mastra/networks/codingTeamNetwork.ts` (new)
- `src/mastra/networks/index.ts` (update exports)
**Dependencies**: CODE-6, CODE-7, CODE-8, CODE-9
**Effort**: M
**Verification**: Manual test via Mastra Studio

### CODE-11: Coding A2A Coordinator
**Description**: Create an A2A coordinator for parallel multi-agent coding workflows.
**Acceptance Criteria**:
- GIVEN a complex coding task
- WHEN the coordinator orchestrates
- THEN multiple agents work in parallel and results are synthesized
**Files**:
- `src/mastra/a2a/codingA2ACoordinator.ts` (new)
**Dependencies**: CODE-10
**Effort**: M
**Verification**: Manual test via Mastra Studio

---

## Phase 4: Integration & Documentation

### CODE-12: Register in Mastra Instance
**Description**: Export all new agents, tools, and networks from mastra index.
**Acceptance Criteria**:
- GIVEN new implementations
- WHEN registered in Mastra
- THEN they are accessible via mastra.getAgent(), API, and Studio
**Files**:
- `src/mastra/index.ts` (update)
- `src/mastra/tools/index.ts` (update)
**Dependencies**: CODE-10, CODE-11
**Effort**: S
**Verification**: `npm run dev` starts without errors

### CODE-13: Update AGENTS.md Documentation
**Description**: Document all new tools, agents, and networks in AGENTS.md files.
**Acceptance Criteria**:
- GIVEN new implementations
- WHEN documentation is updated
- THEN all components are catalogued with descriptions
**Files**:
- `src/mastra/tools/AGENTS.md` (update)
- `src/mastra/agents/AGENTS.md` (update)
- `src/mastra/networks/AGENTS.md` (update)
- `src/mastra/a2a/AGENTS.md` (update)
**Dependencies**: CODE-12
**Effort**: S
**Verification**: Documentation review

---

## Task Summary

| Phase | Tasks | Total Effort |
|-------|-------|--------------|
| Phase 1: Core Tools | CODE-1 to CODE-5 | 2M + 2S = ~3M |
| Phase 2: Coding Agents | CODE-6 to CODE-9 | 4M |
| Phase 3: Network & Coordination | CODE-10, CODE-11 | 2M |
| Phase 4: Integration | CODE-12, CODE-13 | 2S |

**Total Estimate**: ~9M effort (Medium = 2-4 hours, Small = 1-2 hours)

## Dependency Graph

```
Phase 1 (Tools):
CODE-1 ─┬─> CODE-6, CODE-9
CODE-2 ─┼─> CODE-6, CODE-7, CODE-8, CODE-9
CODE-3 ───> CODE-8
CODE-4 ─┴─> CODE-7, CODE-9
CODE-5 ───> CODE-6

Phase 2 (Agents):
CODE-6 ─┬
CODE-7 ─┼─> CODE-10
CODE-8 ─┼
CODE-9 ─┘

Phase 3 (Network):
CODE-10 ──> CODE-11

Phase 4 (Integration):
CODE-10, CODE-11 ──> CODE-12 ──> CODE-13
```

