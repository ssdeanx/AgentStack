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
- [x] Improve Chat UI and Google 3 Model Support:
  - [x] Add Gemini 3 Flash and update Gemini 3 Pro in `google-models.ts`.
  - [x] Improve `ChatInput` with `ModelSelector`, `Context`, `SpeechButton`, and `ActionMenu`.
  - [x] Create `ChatSidebar` for agent details, checkpoints, and memory settings.
  - [x] Update `ChatPage` layout to include sidebar and adjust height for Navbar.
  - [x] Restore all features to `ChatHeader` and add `mt-16` to lower it below the Navbar.
  - [x] Add `gemini3Expert` agent to `agents.ts`.

## Summary

Enhanced the Chat UI and added support for Google Gemini 3 models:

1. **Google 3 Models**: Added `gemini-3-flash-preview` and updated `gemini-3-pro-preview` in the model configuration.
2. **Chat UI Improvement**:
   - **Rich Input**: The `ChatInput` now features a model selector, token usage context, speech-to-text button, and an action menu for attachments.
   - **Sidebar Layout**: Added a `ChatSidebar` that displays agent capabilities, conversation checkpoints, and memory configuration (Thread ID/Resource ID).
   - **Lowered Header**: The `ChatHeader` now has a top margin (`mt-16`) to sit perfectly below the fixed global Navbar. All original features (checkpoints, memory settings, usage) have been restored to the header while also being available in the sidebar.
   - **Layout Adjustment**: Updated the `ChatPage` height to `h-[calc(100vh-4rem)]` to account for the Navbar height and prevent unwanted scrolling.
3. **New Agent**: Added a specialized `Gemini 3 Expert` agent configuration.
