import {
  NodeSDK,
  ATTR_SERVICE_NAME,
  resourceFromAttributes,
} from "@mastra/core/telemetry/otel-vendor";
import { Context, TextMapGetter } from "@opentelemetry/api";
import { LangfuseExporter } from "langfuse-vercel";
import { context } from "@opentelemetry/api";

export function register() {
  const exporter = new LangfuseExporter({
    // ... Langfuse config
  });

  const sdk = new NodeSDK({
    autoDetectResources: true,
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "ai",
    }),
    traceExporter: exporter,
    instrumentations: [],
    metricReader: undefined,
    contextManager: undefined,
    views: [],
    textMapPropagator: {
        inject: () => {
            context
        },
        extract: (context: Context, _carrier: any, _getter: TextMapGetter<any>): Context => {
            return context;
        },
        fields: () => [],
    },
  });

  sdk.start();
}
