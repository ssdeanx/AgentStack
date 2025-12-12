//import {
//  NodeSDK,
//  ATTR_SERVICE_NAME,
//  resourceFromAttributes,
//} from "@mastra/core/telemetry/otel-vendor";
import type { Context, TextMapGetter} from "@opentelemetry/api";
import { ROOT_CONTEXT, context } from "@opentelemetry/api";


  //const sdk = new NodeSDK({
  //  autoDetectResources: true,
  //  resource: resourceFromAttributes({
  //    [ATTR_SERVICE_NAME]: "ai",
  //  }),
  //  traceExporter: exporter,
  // instrumentations: [InstrumentClass],
 //   metricReader: undefined,
   // contextManager: {
  //  active: () => ROOT_CONTEXT,
   // disable() { return this; },
    //enable() { return this; },
  //  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(_context: Context, fn: F, thisArg?: ThisParameterType<F>, ...args: A): ReturnType<F> {
  //    return fn.apply(thisArg, args);
  //  },
  //  bind<T>(_context: Context, target: T): T {
  //    return target;
  //  },
  //},
  //textMapPropagator: {
  //  inject: () => {},
  //  extract: (context: Context, _carrier: any, _getter: TextMapGetter<any>): Context => {
  //    return context;
  //  },
  //  fields: () => [],
  //},
//});

//  sdk.start();
//}
