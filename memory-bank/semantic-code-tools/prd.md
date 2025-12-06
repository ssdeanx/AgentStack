# Feature: Semantic Code Analysis Tools

## Summary
Implement high-performance semantic code analysis tools (`find-references`, `find-symbol`) using `ts-morph`. These tools enable agents to navigate the codebase intelligently by understanding symbol relationships (definitions, usages) rather than just text matching. A `ProjectCache` singleton ensures performance by reusing `ts-morph` Project instances.

## User Stories
1. As an agent, I want to find all references to a specific symbol (function, class, variable) so that I can understand how it is used across the codebase.
2. As an agent, I want to locate the definition of a symbol so that I can analyze its implementation.
3. As a developer, I want these tools to be performant (caching parsed projects) so that agent interactions remain fast.

## Acceptance Criteria
- **ProjectCache**:
  - Singleton pattern implementation.
  - Caches `ts-morph` Project instances by path.
  - LRU eviction policy (optional but good for robustness).
- **find-references**:
  - Input: `symbolName`, `projectPath`, optional `filePath`/`line`.
  - Output: List of references with file path, line number, and context.
  - Uses `ts-morph` for accurate semantic resolution.
- **find-symbol**:
  - Input: `symbolName`, `projectPath`, optional `symbolType`.
  - Output: List of symbol definitions with kind (function, class, etc.) and location.
  - Supports filtering by type.

## Non-Functional Requirements
- **Performance**: Subsequent calls for the same project should be < 1s (using cache).
- **Memory**: Cache should manage memory usage (e.g., limit number of cached projects).
- **Reliability**: Handle syntax errors in files gracefully without crashing.

## Out of Scope
- AST modification (read-only analysis for now).

## Open Questions
- [ ] Should we include `glob` for file discovery if we expand beyond TS/JS? (Currently relying on `ts-morph` for TS/JS).
