# Mastra Tracing Configuration Reference

## ObservabilityRegistryConfig

```typescript
interface ObservabilityRegistryConfig {
  default?: { enabled?: boolean };
  configs?: Record<string, Omit<ObservabilityInstanceConfig, "name"> | ObservabilityInstance>;
  configSelector?: ConfigSelector;
}
```

## ObservabilityInstanceConfig

```typescript
interface ObservabilityInstanceConfig {
  name: string;
  serviceName: string;
  sampling?: SamplingStrategy;
  exporters?: ObservabilityExporter[];
  spanOutputProcessors?: SpanOutputProcessor[];
  includeInternalSpans?: boolean;
  requestContextKeys?: string[];
  /**
   * NOTE: Tools executing long-running or expensive logic should emit TOOL_CALL spans
   * and include `tool.*` metadata (e.g., `tool.id`, `tool.input.dataCount`). If you
   * need to capture request-context-derived values for tool spans, add those keys to
   * requestContextKeys so they are included automatically in trace metadata.
   */
  serializationOptions?: SerializationOptions;
}
```

## SerializationOptions

Options for controlling how span data is serialized before export.

```typescript
interface SerializationOptions {
  maxStringLength?: number;
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
}
```

## SamplingStrategy

```typescript
type SamplingStrategy =
  | { type: "always" }
  | { type: "never" }
  | { type: "ratio"; probability: number }
  | { type: "custom"; sampler: (options?: TracingOptions) => boolean };
```

## ConfigSelector

```typescript
type ConfigSelector = (
  options: ConfigSelectorOptions,
  availableConfigs: ReadonlyMap<string, ObservabilityInstance>,
) => string | undefined;
```

## ConfigSelectorOptions

```typescript
interface ConfigSelectorOptions {
  requestContext?: RequestContext;
}
```

## Registry Methods

### registerInstance
```typescript
registerInstance(name: string, instance: ObservabilityInstance, isDefault?: boolean): void;
```
Registers an observability instance in the registry.

### getInstance
```typescript
getInstance(name: string): ObservabilityInstance | undefined;
```
Retrieves an observability instance by name.

### getDefaultInstance
```typescript
getDefaultInstance(): ObservabilityInstance | undefined;
```
Returns the default observability instance.

### getSelectedInstance
```typescript
getSelectedInstance(options: ConfigSelectorOptions): ObservabilityInstance | undefined;
```
Returns the observability instance selected by the config selector or default.

### listInstances
```typescript
listInstances(): ReadonlyMap<string, ObservabilityInstance>;
```
Returns all registered observability instances.

### hasInstance
```typescript
hasInstance(name: string): boolean;
```
Checks if an observability instance exists.

### setConfigSelector
```typescript
setConfigSelector(selector: ConfigSelector): void;
```
Sets the config selector function.

### unregisterInstance
```typescript
unregisterInstance(name: string): boolean;
```
Removes an observability instance from the registry.

### clear
```typescript
clear(): void;
```
Clears all instances without shutdown.

### shutdown
```typescript
async shutdown(): Promise<void>;
```
Shuts down all observability instances and clears the registry.