/**
 * Custom AI Elements
 *
 * Premium, high-quality AI UI components built on the base ai-elements and ui components.
 * These components feature enhanced animations, gradient styling, and rich interactivity.
 *
 * Usage:
 * ```tsx
 * import {
 *   ThinkingIndicator,
 *   ToolExecutionCard,
 *   WorkflowExecution,
 *   AgentResponse,
 *   CodeEditor,
 * } from "@/src/components/ai-elements/custom";
 * ```
 */

export {
  ThinkingIndicator,
  ThinkingState,
  type ThinkingIndicatorProps,
  type ThinkingIndicatorVariant,
  type ThinkingStateProps,
} from "./thinking-indicator";

export {
  ToolExecutionCard,
  ToolExecutionList,
  type ToolExecutionCardProps,
  type ToolExecutionListProps,
  type ToolExecutionStatus,
} from "./tool-execution-card";

export {
  WorkflowExecution,
  WorkflowTimeline,
  type WorkflowExecutionProps,
  type WorkflowStep,
  type WorkflowStepTimeline,
  type StepStatus,
} from "./workflow-execution";

export {
  AgentResponse,
  AgentAvatar,
  type AgentResponseProps,
  type AgentAvatarProps,
  type Source,
} from "./agent-response";

export {
  CodeEditor,
  CodeEditorSimple,
  type CodeEditorProps,
  type CodeEditorSimpleProps,
  type CodeLanguage,
  type EditorFile,
  type EditorTheme,
} from "./code-editor";
