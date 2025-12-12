import type { DynamicToolUIPart } from "ai";

/**
 * Robustly convert a Mastra `data-tool-*` part into a `DynamicToolUIPart`.
 *
 * This is a best-effort mapper that tries to handle several shapes Mastra
 * might emit for nested tool parts. It extracts values from common fields,
 * supports nested payloads, and normalizes the state into the AI SDK `ToolUIPart` states.
 *
 * If the part does not look like a Mastra `data-tool-*` part, returns null.
 */
type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function mapDataToolPartToDynamicToolPart(part: unknown): DynamicToolUIPart | null {
  if (!isRecord(part)) {return null;}
  const partType = part.type
  if (typeof partType !== "string" || !partType.startsWith("data-tool")) {
    // Not a Mastra data-tool part
    return null;
  }

  // Utility helpers
  const first = <T>(...xs: Array<T | undefined | null>) =>
    xs.find((x) => x !== undefined && x !== null) as T | undefined;

  // Extract the primary payload object to inspect - Mastra sometimes nests
  // the payload in different properties (data, payload, body, call, invocation, etc.)
  const candidates: unknown[] = [part.data, part.payload, part.body, part].filter(
    (v) => v !== undefined && v !== null
  );

  // If payload has nested "data" and/or "call" shapes, prefer them
  let payload: unknown = undefined;
  for (const candidate of candidates) {
    if (!isRecord(candidate)) {continue;}
    if (isRecord(candidate.call)) {
      payload = candidate.call;
      break;
    }
    if (isRecord(candidate.invocation)) {
      payload = candidate.invocation;
      break;
    }
    if (isRecord(candidate.toolInvocation)) {
      payload = candidate.toolInvocation;
      break;
    }
    if (isRecord(candidate.data)) {
      const dataObj = candidate.data
      if (isRecord(dataObj.input) || isRecord(dataObj.output) || dataObj.id !== undefined) {
        payload = dataObj;
        break;
      }
    }
  }

  // fallback to first object candidate
  payload = payload ?? candidates[0] ?? {};

  // Some nested shapes: payload may itself contain another "payload" or "data"
  let inner: unknown = payload;
  if (!isRecord(inner)) {inner = {};}
  if (isRecord((inner as UnknownRecord).payload)) {inner = (inner as UnknownRecord).payload;}
  if (isRecord((inner as UnknownRecord).data) && Object.keys((inner as UnknownRecord).data as UnknownRecord).length > 0) {
    inner = (inner as UnknownRecord).data;
  }

  // Attempt to find a "call" or "execution" sub-object if present
  if (isRecord((inner as UnknownRecord).call)) {inner = (inner as UnknownRecord).call;}
  else if (isRecord((inner as UnknownRecord).exec)) {inner = (inner as UnknownRecord).exec;}
  else if (isRecord((inner as UnknownRecord).execution)) {inner = (inner as UnknownRecord).execution;}
  else if (isRecord((inner as UnknownRecord).run)) {inner = (inner as UnknownRecord).run;}

  const innerObj = isRecord(inner) ? inner : ({} as UnknownRecord)
  const payloadObj = isRecord(payload) ? payload : ({} as UnknownRecord)

  // Now, pick the fields from different possible shapes
  const toolCallId =
    (first<string>(
      innerObj.toolCallId as string | undefined,
      innerObj.callId as string | undefined,
      innerObj.id as string | undefined,
      innerObj.tool_call_id as string | undefined,
      innerObj.requestId as string | undefined,
      innerObj.runId as string | undefined
    ) ?? first<string>(
      payloadObj.toolCallId as string | undefined,
      payloadObj.id as string | undefined,
      payloadObj.callId as string | undefined,
      payloadObj.tool_call_id as string | undefined
    ));

  if (typeof toolCallId !== "string" || toolCallId.trim().length === 0) {
    return null;
  }

  const toolName =
    (first<string>(
      innerObj.toolName as string | undefined,
      innerObj.name as string | undefined,
      innerObj.tool as string | undefined,
      innerObj.toolId as string | undefined,
      innerObj.tool_id as string | undefined
    ) ??
      first<string>(
        payloadObj.toolName as string | undefined,
        payloadObj.name as string | undefined,
        payloadObj.tool as string | undefined,
        payloadObj.toolId as string | undefined
      ));

  const progressMessage = first<string>(
    innerObj.message as string | undefined,
    payloadObj.message as string | undefined
  );

  // Input detection: args / parameters / input / params
  const input =
    innerObj.input ??
    innerObj.args ??
    innerObj.parameters ??
    innerObj.params ??
    payloadObj.input ??
    payloadObj.args ??
    payloadObj.params ??
    (typeof progressMessage === "string" && progressMessage.trim().length > 0
      ? { message: progressMessage.trim() }
      : undefined) ??
    undefined;

  // Output detection: output / result / value / return
  const output =
    innerObj.output ??
    innerObj.result ??
    innerObj.value ??
    innerObj.return ??
    payloadObj.output ??
    payloadObj.result ??
    payloadObj.value ??
    undefined;

  // Error detection
  const errorText =
    first<string | undefined>(
      (innerObj.errorText as string | undefined) ?? (innerObj.error as string | undefined) ?? (innerObj.err as string | undefined),
      (payloadObj.errorText as string | undefined) ?? (payloadObj.error as string | undefined) ?? (payloadObj.err as string | undefined)
    ) ?? undefined;

  // Map any status-like property to AI SDK tool state
  const rawState = String(innerObj.state ?? innerObj.status ?? payloadObj.state ?? payloadObj.status ?? "");

  // Convert a free-form status to tool states defined by the SDK
  const mapToToolState = (s: string): DynamicToolUIPart["state"] => {
    const st = String(s ?? "").toLowerCase();

    if (!st) {
      // if output exists, consider it output-available; otherwise input-available.
      if (output !== undefined && output !== null) {
        return "output-available";
      }
      return "input-available";
    }

    if (st.includes("stream") || st.includes("pending") || st.includes("started")) {
      return "input-streaming";
    }
    if (st.includes("run") || st.includes("running") || st.includes("in-flight") || st.includes("started")) {
      return "input-available";
    }
    if (st.includes("approval") || st.includes("approve-request") || st.includes("approval-requested")) {
      return "approval-requested" as DynamicToolUIPart["state"];
    }
    if (st.includes("approved") || st.includes("approval-responded")) {
      return "approval-responded" as DynamicToolUIPart["state"];
    }
    if (st.includes("success") || st.includes("done") || st.includes("finished") || st.includes("output-available") || st.includes("completed")) {
      return "output-available";
    }
    if (st.includes("deny") || st.includes("denied") || st.includes("rejected")) {
      return "output-denied" as DynamicToolUIPart["state"];
    }
    if (st.includes("error") || st.includes("failed") || st.includes("exception")) {
      return "output-error";
    }

    // fallback: if an output is present consider finished, otherwise input available
    if (output !== undefined && output !== null) {return "output-available";}
    return "input-available";
  };

  const state = mapToToolState(rawState);

  // Finally construct the DynamicToolUIPart. We only fill the fields we can derive.
  const dynamic: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolCallId: String(toolCallId),
    toolName: toolName ?? (typeof innerObj.tool === "string" ? innerObj.tool : undefined) ?? `tool-${String(toolCallId).slice(0, 8)}`,
    input: input ?? undefined,
    output: output ?? undefined,
    errorText: errorText ?? undefined,
    state,
  } as DynamicToolUIPart;

  // Attach any useful debug/metadata (opaque) — non-standard; client code can ignore it.
  try {
    (dynamic as unknown as { __mastra?: unknown }).__mastra = {
      sourceType: partType,
      original: part,
    };
  } catch {
    /* ignore: best-effort debug metadata attach */
  }

  return dynamic;
}
