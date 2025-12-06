# Tasks: Semantic Code Analysis Tools

## SEM-1: Implement ProjectCache
**Description**: Create the `ProjectCache` singleton to manage `ts-morph` instances.
**Acceptance**:
- Singleton access.
- `getOrCreate` returns existing project or creates new one.
- Basic memory management (limit number of projects).
**Files**: `lib/ProjectCache.ts`
**Dependencies**: `ts-morph`
**Effort**: S
**Verification**: Unit test ensuring same instance returned.

## SEM-2: Implement PythonParser
**Description**: Implement `PythonParser` utility using Python's `ast` module via `child_process`.
**Acceptance**:
- Parses Python code to find symbols (functions, classes, variables).
- Calculates complexity.
- Caches results.
**Files**: `lib/PythonParser.ts`
**Dependencies**: Python 3 installed
**Effort**: M
**Verification**: Unit test with sample Python code.

## SEM-3: Implement find-references Tool
**Description**: Create the `find-references` tool using `ProjectCache` and `PythonParser`.
**Acceptance**:
- Finds usages of a symbol in TS/JS and Python.
- Supports context (file/line) for precise lookup.
- Returns formatted list of references.
**Files**: `src/mastra/tools/find-references.tool.ts`
**Dependencies**: SEM-1, SEM-2
**Effort**: M
**Verification**: Test with a known symbol in the codebase.

## SEM-4: Implement find-symbol Tool
**Description**: Create the `find-symbol` tool using `ProjectCache` and `PythonParser`.
**Acceptance**:
- Finds definitions of symbols in TS/JS and Python.
- Filters by type (function, class, etc.).
- Returns preview of the symbol.
**Files**: `src/mastra/tools/find-symbol.tool.ts`
**Dependencies**: SEM-1, SEM-2
**Effort**: M
**Verification**: Test finding a class definition.

## SEM-5: Register Tools
**Description**: Export tools from `index.ts` to make them available to agents.
**Acceptance**:
- Tools exported in `src/mastra/tools/index.ts`.
**Files**: `src/mastra/tools/index.ts`
**Dependencies**: SEM-3, SEM-4
**Effort**: S
**Verification**: Verify tools are callable via Mastra.
