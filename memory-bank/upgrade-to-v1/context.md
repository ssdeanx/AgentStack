# Context - Migration scratchpad

## Phase: PLANNING

## Session: 2025-12-06

### Decisions made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Migration path | Codemods + manual fixes | Use automation where safe, manual updates for custom shapes and tests |
| Node & CI | Node >= 22.13.0 | Upgrade CI / dev images before merging large PRs |
| Scope defaults | Explicitly set `scope: 'thread'` where conversation-scoped behavior is required | Mastra v1 default scope changed to resource |
| Type conversion | Replace MastraMessageV2 with MastraDBMessage and use converters for UI formats | Clearer semantics, simpler default storage format |

### Blockers / Open questions

- We need to find all call sites that depend on old return shapes (messagesV2, uiMessages) — codemods may not cover these
- Determine if any third-party adapters or external integrations expect old types (search required)
- Tests are extensive; tests that mock old contexts or shapes must be updated and validated during each PR
- Many createTool calls will need a manual signature update even after a codemod

### Next steps

1. Preflight: ensure CI images use Node >= 22.13.0 and create `migration/v1` top-level branch
2. Run the global codemod and save a report in `upgrade-to-v1/codemod-reports/` (commit with `migration/v1/codemod-run-1`)
3. Apply per-area codemod, review and commit per-area PRs (tools, memory, workflows, storage, tracing)
4. Triage remaining manual edits (generate `upgrade-to-v1/manual-fixes.md` — done) and assign owners
5. Implement manual fixes per PR with tests and CI validation
