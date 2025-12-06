# PRD - Upgrade to Mastra v1 (Full repository migration)

## Problem

The repository currently depends on Mastra 0.x packages and patterns in many areas (Memory, Tools, Agents, Workflows, Storage, Vectors, Tracing, MCP, Client SDKs, Evals and Voice).

Mastra v1 introduces multiple breaking changes across the core packages and APIs. Upgrading without coordinated changes will cause runtime errors, type mismatches, and CI failures.

## Goals

- Migrate all Memory API usage (query() -> recall(), param renames, MastraMessageV2 → MastraDBMessage, remove deprecated modes)
- Update Tool signatures to the new execute(inputData, context) shape and update tests that mock RuntimeContext/RequestContext
- Migrate Agent run and voice API changes (RuntimeContext -> RequestContext, property->getter changes)
- Update Workflows (createRunAsync -> createRun, function renames) and any call sites
- Update Storage/Vectors to list* pattern and page/perPage pagination
- Update Tracing/Observability configuration (telemetry -> observability, processors rename)
- Update Client SDK and Evals API changes
- Replace deprecated patterns and add regression tests for new formats

## Success criteria

- All tests pass in CI after updating to Mastra v1
- No runtime references remain to the old API surface across the repo
- Codemods applied where safe with a follow-up manual fixes list for remaining items
- Updated developer docs + README with migration checklist and rollback plan

## Stakeholders & Owners

- Migration lead: TBD — pick a maintainer to own the campaign
- Area owners (examples):
  - Tools: @frontend-team / tool authors
  - Memory & Storage: @backend-team / storage owners
  - Workflows & Agents: @workflow-team
  - Observability & CI: @infra-team

## Timeline & Estimates

- Preflight (1–3 days): update CI Node images, create `migration/v1` branch, run global codemod in a disposable branch
- Per-area migration (1–2 weeks per area): tools → memory → workflows & agents → storage/vectors → observability/tests
- Finalization & rollouts (1 week): merge, monitor, update docs

## Risks & Mitigations

- Risk: Codemod outputs will not cover bespoke adapter code or complex conversions
  - Mitigation: Use codemod to fix obvious renames, then open small per-area PRs to handle manual fixes and tests

- Risk: Tests break in many unrelated areas (due to type/shape changes)
  - Mitigation: update tests incrementally in the same area PRs and add test factories / converters to reduce duplication

## Rollback & Emergency plan

If a migration PR causes serious regressions in mainline CI:
1. Revert the problematic PR
2. Re-run targeted codemod or manual fixes in a branch and add additional tests
3. Run a CI smoke pipeline using a smaller test subset and debug failures before reintroducing the change

