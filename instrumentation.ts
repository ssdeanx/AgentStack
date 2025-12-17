import { registerOTel } from "@vercel/otel";

/**
 * OTEL configuration is primarily handled by Mastra in `src/mastra/index.ts`.
 *
 * To avoid double instrumentation or conflicting exporters, Vercel's `registerOTel`
 * is only used when explicitly enabled via the `VERCEL_OTEL_ENABLED` env flag.
 *
 * When `VERCEL_OTEL_ENABLED` is not set to `"true"`, this file becomes a no-op
 * and Mastra's OTEL/exporter configuration is the single source of truth.
 */
const VERCEL_OTEL_ENABLED = process.env.VERCEL_OTEL_ENABLED === "true";

export function register() {
  if (!VERCEL_OTEL_ENABLED) {
    // Rely on Mastra's OTEL/exporter configuration in `src/mastra/index.ts`.
    // Intentionally do **not** call `registerOTel` here to prevent
    // duplicate instrumentation and conflicting OTEL SDK instances.
    return;
  }

  // When explicitly enabled, use Vercel's OTEL setup.
  // Keep the service name aligned with Mastra's configuration (`"ai"`).
  registerOTel({
    serviceName: "ai",
  });
}
