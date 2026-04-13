# Plan: Chat usage-type cleanup

This session is focused on replacing the old token-counter shape with the AI SDK `LanguageModelUsage` type in the chat provider, prompt input, and chat message surfaces while keeping the existing chat-context contract stable.

**Completed**
1. Normalize provider usage data.
   - `app/chat/providers/chat-context.tsx` now derives usage as `LanguageModelUsage` from the streamed finish data.
   - The provider still returns the existing chat context contract at the boundary, so the transport/request-context flow stays unchanged.

2. Update the prompt input token display.
   - `app/chat/components/chat-input.tsx` now reads total tokens from `LanguageModelUsage.totalTokens`.
   - The old `inputTokens + outputTokens` counter path is no longer used for the footer summary.

3. Surface usage in the message header.
   - `app/chat/components/chat-messages.tsx` now renders a concise token summary badge from `LanguageModelUsage`.
   - The file keeps using the shared `agent-tools` adapter for tool rendering, but no longer depends on the old token-summary import path.

4. Remove renderer-local chat alias imports.
   - `app/chat/components/chat-messages.tsx` now infers its remaining data types from the exact props of the rendered ai-elements wrapper components.
   - The direct `chat-context-types.ts` imports were removed from the renderer path.

5. Remove provider contract alias dependency.
   - `app/chat/providers/chat-context.tsx` now owns the chat contract types locally.
   - `app/chat/providers/chat-context-hooks.ts` imports `ChatContextValue` type-only from the provider file instead of the shared alias file.

6. IDE-style file inspector pass.
   - `app/chat/components/code-agent-chat.tsx` now renders a richer selected-file inspector with AI elements for code, output, JSX preview, stack traces, snippets, and artifact metadata.
   - `app/chat/components/code-layout.tsx` now owns the workspace/sandbox file reads and passes a typed selected-file snapshot into the chat pane.

**Next**
7. Continue the ai-elements migration in the `code-*` surfaces.
- Keep using direct ai-elements compounds where possible.
- Preserve `agent-tools` as the only `agent-*` bridge that remains in active use.
- Revisit `code-agent-chat.tsx`, `code-layout.tsx`, and `code-studio.tsx` if we want to remove the remaining wrapper components.

**Verification**
1. Run targeted VS Code error checks on the edited chat files.
2. Smoke-test the `/chat` route in a browser.
3. Confirm the usage badge, footer token counter, and provider data all stay in sync.
