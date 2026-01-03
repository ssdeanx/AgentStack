# Copilot Processing: GitHub Tool Enhancement

## User Request

The user provided `src/mastra/tools/github.ts` and mentioned `vscode-websearchforcopilot_webSearch`.
Instructions also mention Unreal Engine ThirdPerson template project and UE C++ standards, which was investigated and found to be a conflict/error in the instructions.

## Project Context Discovery

- **Project Type**: Mastra-based multi-agent toolkit (AgentStack).
- **Tech Stack**: Next.js 16, TypeScript, Mastra, PgVector, AI Elements.
- **Unreal Engine Conflict**: No mention of Unreal Engine or C++ in `memory-bank/` or codebase. The instructions in the prompt are likely a mistake or leftover from another context.
- **Decision**: Proceed with Mastra/Next.js context as defined in the Memory Bank.

## Status

- [x] Research user intent regarding Unreal Engine vs Mastra (Confirmed Mastra project)
- [x] Identify potential enhancements for `github.ts`
- [x] Implement new GitHub tools:
  - [x] `createPullRequest`
  - [x] `mergePullRequest`
  - [x] `addIssueComment`
  - [x] `getPullRequest`
  - [x] `getIssue`
- [x] Fix `bgColorAgent.ts` TypeScript error:
  - [x] Update `colorChangeTool` to use `@mastra/core/tools`
  - [x] Add `execute` function to `colorChangeTool`
- [x] Fix Navbar Runtime Error:
  - [x] Update `ui/navigation-menu.tsx` to handle `asChild` correctly in `NavigationMenuTrigger`.
- [x] Update @ai-sdk/google to v3:
  - [x] Update `src/mastra/config/google.ts` to use `createGoogleGenerativeAI`.
  - [x] Update `src/mastra/config/pg-storage.ts` to use local provider instance instead of legacy facade.
- [x] Update documentation

## Summary

Enhanced the GitHub toolset in `src/mastra/tools/github.ts` by adding 5 new tools:

1. `createPullRequest`: Create a new PR with title, head, base, and body.
2. `mergePullRequest`: Merge an existing PR using merge, squash, or rebase methods.
3. `addIssueComment`: Add comments to issues or PRs.
4. `getPullRequest`: Retrieve detailed information about a specific PR.
5. `getIssue`: Retrieve detailed information about a specific issue.

Fixed a TypeScript error in `src/mastra/agents/bgColorAgent.ts` where `colorChangeTool` was incompatible with the `Agent` class.

Fixed a runtime error in `app/components/navbar.tsx` caused by `NavigationMenuTrigger` receiving multiple children when `asChild` was true. The `NavigationMenuTrigger` component in `ui/navigation-menu.tsx` was updated to only render the chevron icon when `asChild` is false.

Updated `src/mastra/config/google.ts` and `src/mastra/config/pg-storage.ts` to be compatible with `@ai-sdk/google` v3. This involved:

- Using `createGoogleGenerativeAI` to create a provider instance in `google.ts`.
- Updating `pg-storage.ts` to import the `google` provider from the local config instead of the removed facade in `@ai-sdk/google`.
- Removing unnecessary type casts in `pg-storage.ts`.
