/**
 * Model Configuration System
 * Centralized configuration for all AI models available through installed providers.
 * Used by chat, networks, and dashboard for model selection.
 */

export type ModelProvider =
  | "google"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "google-vertex"
  | "ollama"

export type ModelCapability =
  | "chat"
  | "reasoning"
  | "vision"
  | "embedding"
  | "code"
  | "audio"

export interface ModelPricing {
  input: number
  output: number
}

export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  contextWindow: number
  capabilities: ModelCapability[]
  description?: string
  isDefault?: boolean
  pricing?: ModelPricing
}

export interface ProviderConfig {
  id: ModelProvider
  name: string
  logo: string
  envKey: string
}

import { GOOGLE_MODELS, GOOGLE_PROVIDER_CONFIG } from './google-models';
import { OPENAI_MODELS, OPENAI_PROVIDER_CONFIG } from './openai-models';
import { ANTHROPIC_MODELS, ANTHROPIC_PROVIDER_CONFIG } from './anthropic-models';
import { OPENROUTER_MODELS, OPENROUTER_PROVIDER_CONFIG } from './openrouter-models';
import { OLLAMA_MODELS, OLLAMA_PROVIDER_CONFIG } from './ollama-models';

export const PROVIDER_CONFIGS: Record<ModelProvider, ProviderConfig> = {
  google: GOOGLE_PROVIDER_CONFIG,
  "google-vertex": {
    id: "google-vertex",
    name: "Google Vertex AI",
    logo: "google-vertex",
    envKey: "GOOGLE_VERTEX_PROJECT",
  },
  openai: OPENAI_PROVIDER_CONFIG,
  anthropic: ANTHROPIC_PROVIDER_CONFIG,
  openrouter: OPENROUTER_PROVIDER_CONFIG,
  ollama: OLLAMA_PROVIDER_CONFIG,
}

export const MODEL_CONFIGS: ModelConfig[] = [
  ...GOOGLE_MODELS,
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...OPENROUTER_MODELS,
  ...OLLAMA_MODELS,
]

export const PROVIDER_ORDER: ModelProvider[] = [
  "google",
  "openai",
  "anthropic",
  "openrouter",
  "ollama",
  "google-vertex",
]

export function getModelsByProvider(): Record<ModelProvider, ModelConfig[]> {
  const grouped: Record<ModelProvider, ModelConfig[]> = {
    google: [],
    openai: [],
    anthropic: [],
    openrouter: [],
    ollama: [],
    "google-vertex": [],
  }

  for (const model of MODEL_CONFIGS) {
    grouped[model.provider].push(model)
  }

  return grouped
}

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.id === modelId)
}

export function getDefaultModel(): ModelConfig {
  return MODEL_CONFIGS.find((m) => m.isDefault === true) ?? MODEL_CONFIGS[0]
}

export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {return `${(tokens / 1000000).toFixed(1)}M`}
  if (tokens >= 1000) {return `${(tokens / 1000).toFixed(0)}K`}
  return String(tokens)
}
