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
export function mapDataToolPartToDynamicToolPart(part: any): DynamicToolUIPart | null {
  if (!part || typeof part !== "object") return null;
  if (typeof part.type !== "string" || !part.type.startsWith("data-tool")) {
    // Not a Mastra data-tool part
    return null;
  }

  // Utility helpers
  const first = <T>(...xs: (T | undefined | null)[]) => xs.find((x) => x !== undefined && x !== null) as T | undefined;

  const toStringIfExists = (v: any) => (v === undefined || v === null ? undefined : String(v));

  const isObject = (v: any) => v && typeof v === "object" && !Array.isArray(v);

  // Extract the primary payload object to inspect - Mastra sometimes nests
  // the payload in different properties (data, payload, body, call, invocation, etc.)
  const candidates: any[] = [
    part.data,
    (part as any).payload,
    (part as any).body,
    part,
  ].filter(Boolean);

  // If payload has nested "data" and/or "call" shapes, prefer them
  let payload: any = undefined;
  for (const candidate of candidates) {
    if (isObject(candidate?.call)) {
      payload = candidate.call;
      break;
    }
    if (isObject(candidate?.invocation)) {
      payload = candidate.invocation;
      break;
    }
    if (isObject(candidate?.toolInvocation)) {
      payload = candidate.toolInvocation;
      break;
    }
    if (isObject(candidate?.data) && (isObject(candidate.data?.input) || isObject(candidate.data?.output) || candidate.data.id)) {
          payload = candidate.data;
          break;
    }
  }

  // fallback to first object candidate
  payload = payload ?? candidates[0] ?? {};

  // Some nested shapes: payload may itself contain another "payload" or "data"
  let inner = payload;
  if (!inner || !isObject(inner)) inner = {};
  if (isObject(inner.payload)) inner = inner.payload;
  if (isObject(inner.data) && (Object.keys(inner.data).length > 0)) inner = inner.data;

  // Attempt to find a "call" or "execution" sub-object if present
  if (isObject(inner.call)) inner = inner.call;
  else if (isObject(inner.exec)) inner = inner.exec;
  else if (isObject(inner.execution)) inner = inner.execution;
  else if (isObject(inner.run)) inner = inner.run;

  // Now, pick the fields from different possible shapes
  const toolCallId =
    (first<string>(
      inner?.toolCallId,
      inner?.callId,
      inner?.id,
      inner?.tool_call_id,
      inner?.requestId,
      inner?.runId
    ) ?? first<string>(
      payload?.toolCallId,
      payload?.id,
      payload?.callId,
      payload?.tool_call_id
    ) ?? `toolcall-${Date.now()}`) as string;

  const toolName =
    (first<string>(
      inner?.toolName,
      inner?.name,
      inner?.tool,
      inner?.toolId,
      inner?.tool_id
    ) ??
      first<string>(payload?.toolName, payload?.name, payload?.tool, payload?.toolId)) as string | undefined;

  // Input detection: args / parameters / input / params
  const input =
    inner?.input ??
    inner?.args ??
    inner?.parameters ??
    inner?.params ??
    payload?.input ??
    payload?.args ??
    payload?.params ??
    undefined;

  // Output detection: output / result / value / return
  const output =
    inner?.output ??
    inner?.result ??
    inner?.value ??
    inner?.return ??
    payload?.output ??
    payload?.result ??
    payload?.value ??
    undefined;

  // Error detection
  const errorText =
    first<string | undefined>(
      inner?.errorText ?? inner?.error ?? inner?.err,
      payload?.errorText ?? payload?.error ?? payload?.err
    ) ?? undefined;

  // Map any status-like property to AI SDK tool state
  const rawState =
    (inner?.state ?? inner?.status ?? payload?.state ?? payload?.status ?? "").toString() ?? "";

  // Convert a free-form status to tool states defined by the SDK
  function mapToToolState(s: string): DynamicToolUIPart["state"] {
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
    if (output !== undefined && output !== null) return "output-available";
    return "input-available";
  }

  const state = mapToToolState(rawState);

  // Finally construct the DynamicToolUIPart. We only fill the fields we can derive.
  const dynamic: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolCallId: String(toolCallId),
    toolName: toolName ?? (typeof inner?.tool === "string" ? inner.tool : undefined) ?? `tool-${(toolCallId ?? "").slice(0, 8)}`,
    input: input ?? undefined,
    output: output ?? undefined,
    errorText: errorText ?? undefined,
    state,
  } as DynamicToolUIPart;

  // Attach any useful debug/metadata (opaque) — non-standard; client code can ignore it.
  try {
    (dynamic as any).__mastra = {
      sourceType: part.type,
      original: part,
    };
  } catch {
    /* ignore: best-effort debug metadata attach */
  }

  return dynamic;
}
