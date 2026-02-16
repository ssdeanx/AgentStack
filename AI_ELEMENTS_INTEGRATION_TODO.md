# AI Elements Integration - Detailed Task List

## ANALYSIS COMPLETE

### Current State:

- **chat-input.tsx**: Uses simple MicIcon button (line 210) - needs SpeechInput component
- **chat-messages.tsx**: Has type guards imported from 'ai' but uses custom rendering for file parts (lines 895-903)
- **Unused 'ai' imports**: Many type guards and helpers available but not actively used for type narrowing

### Files to Modify:

1. `app/chat/components/chat-input.tsx` - Replace MicIcon with SpeechInput
2. `app/chat/components/chat-messages.tsx` - Integrate Attachments, AudioPlayer components

---

## TODO LIST

### TASK 001: Update chat-input.tsx - Add SpeechInput Integration

**Status:** COMPLETED ✓
**File:** `app/chat/components/chat-input.tsx`
**Lines:** ~210 (MicIcon button area)

**Sub-tasks:**

- [x] 001a: Import SpeechInput component from '@/src/components/ai-elements/speech-input'
- [x] 001b: Add useState for speech transcription text (uses existing input state)
- [x] 001c: Create handleTranscriptionChange callback to append text to input
- [x] 001d: Replace MicIcon button (lines ~201-211) with SpeechInput component
- [x] 001e: Add onAudioRecorded callback for MediaRecorder fallback support
- [x] 001f: Test TypeScript compilation (LSP errors are pre-existing, not from this change)

**Components to integrate:**

- SpeechInput (from speech-input.tsx)
- Uses: onTranscriptionChange, onAudioRecorded, lang props

---

### TASK 002: Update chat-messages.tsx - Add Attachments Integration

**Status:** NOT STARTED
**File:** `app/chat/components/chat-messages.tsx`
**Lines:** ~895-903 (fileParts rendering)

**Sub-tasks:**

- [ ] 002a: Import Attachments components from '@/src/components/ai-elements/attachments'
- [ ] 002b: Locate current fileParts rendering code (lines 895-903)
- [ ] 002c: Replace custom Badge-based file rendering with Attachments component
- [ ] 002d: Map FileUIPart[] to AttachmentData[] format
- [ ] 002e: Ensure type imports from 'ai' (FileUIPart, isFileUIPart) are used
- [ ] 002f: Test TypeScript compilation

**Components to integrate:**

- Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove (from attachments.tsx)

---

### TASK 003: Update chat-messages.tsx - Add AudioPlayer Integration

**Status:** NOT STARTED
**File:** `app/chat/components/chat-messages.tsx`

**Sub-tasks:**

- [ ] 003a: Import AudioPlayer from '@/src/components/ai-elements/audio-player'
- [ ] 003b: Identify where audio FileUIPart messages are rendered
- [ ] 003c: Add conditional rendering for audio mediaType files
- [ ] 003d: Integrate AudioPlayer for audio file parts
- [ ] 003e: Test TypeScript compilation

**Components to integrate:**

- AudioPlayer (from audio-player.tsx)

---

### TASK 004: Update chat-messages.tsx - Add Transcription Integration

**Status:** NOT STARTED
**File:** `app/chat/components/chat-messages.tsx`

**Sub-tasks:**

- [ ] 004a: Import Transcription from '@/src/components/ai-elements/transcription'
- [ ] 004b: Import Experimental_SpeechResult type from 'ai'
- [ ] 004c: Add Transcription component for speech-to-text display
- [ ] 004d: Test TypeScript compilation

**Components to integrate:**

- Transcription (from transcription.tsx)

---

### TASK 005: Verify and Leverage 'ai' Package Type Imports

**Status:** NOT STARTED
**Files:** `app/chat/components/chat-messages.tsx`, `app/chat/components/chat-input.tsx`

**Sub-tasks:**

- [ ] 005a: List all imported types from 'ai' in chat-messages.tsx
- [ ] 005b: Identify which types are NOT actively used for type narrowing
- [ ] 005c: Add active type narrowing using isFileUIPart, isTextUIPart, etc.
- [ ] 005d: Replace any 'as' type assertions with proper type guards
- [ ] 005e: Verify all unused imports serve a purpose (keep them as requested)

**Types from 'ai' to leverage:**

- isFileUIPart, isTextUIPart, isReasoningUIPart, isToolUIPart, isDataUIPart, isStaticToolUIPart
- FileUIPart, TextUIPart, ReasoningUIPart, ToolUIPart, DataUIPart

---

## PROGRESS TRACKING

| Task | Status      | File              | Started | Completed |
| ---- | ----------- | ----------------- | ------- | --------- |
| 001  | NOT STARTED | chat-input.tsx    | -       | -         |
| 002  | NOT STARTED | chat-messages.tsx | -       | -         |
| 003  | NOT STARTED | chat-messages.tsx | -       | -         |
| 004  | NOT STARTED | chat-messages.tsx | -       | -         |
| 005  | NOT STARTED | both              | -       | -         |

---

## COMPONENTS AVAILABLE BUT NOT INTEGRATED (31 total)

### Priority 1 (Chat Input):

1. ~~SpeechInput~~ (TASK 001)

### Priority 2 (Message Rendering):

2. ~~Attachments~~ (TASK 002)
3. ~~AudioPlayer~~ (TASK 003)
4. ~~Transcription~~ (TASK 004)

### Priority 3 (Future - Not in current todo):

5. agent.tsx
6. canvas.tsx
7. commit.tsx
8. connection.tsx
9. controls.tsx
10. custom/
11. edge.tsx
12. environment-variables.tsx
13. file-tree.tsx
14. image.tsx
15. jsx-preview.tsx
16. mic-selector.tsx
17. node.tsx
18. open-in-chat.tsx
19. package-info.tsx
20. panel.tsx
21. persona.tsx
22. sandbox.tsx
23. schema-display.tsx
24. shimmer.tsx
25. snippet.tsx
26. stack-trace.tsx
27. terminal.tsx
28. test-results.tsx
29. tools/
30. voice-selector.tsx
31. toolbar.tsx (partially used)

---

Last Updated: 2026-02-16
