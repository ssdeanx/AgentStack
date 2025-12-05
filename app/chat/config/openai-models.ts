/**
 * OpenAI Models Configuration
 * Based on https://mastra.ai/models/providers/openai
 */

import type { ModelConfig, ProviderConfig } from './models';

export const OPENAI_PROVIDER_CONFIG: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  logo: "openai",
  envKey: "OPENAI_API_KEY",
};

export const OPENAI_MODELS: ModelConfig[] = [
  // GPT-4.1 Series
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    contextWindow: 1000000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 2, output: 8 },
    description: "1M context window flagship",
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    contextWindow: 1000000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.40, output: 2 },
    description: "Efficient 1M context",
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    contextWindow: 1000000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.10, output: 0.40 },
    description: "Smallest 4.1 model",
  },

  // GPT-4o Series
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 3, output: 10 },
    description: "Multimodal flagship",
    isDefault: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.15, output: 0.60 },
    description: "Affordable GPT-4o",
  },

  // GPT-5 Series
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 1, output: 10 },
    description: "Next-gen flagship",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.25, output: 2 },
    description: "Efficient GPT-5",
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.05, output: 0.40 },
    description: "Smallest GPT-5",
  },
  {
    id: "openai/gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 120 },
    description: "Most capable GPT-5",
  },
  {
    id: "openai/gpt-5-codex",
    name: "GPT-5 Codex",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "code"],
    pricing: { input: 1, output: 10 },
    description: "Code-optimized GPT-5",
  },

  // GPT-5.1 Series
  {
    id: "openai/gpt-5.1",
    name: "GPT-5.1",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 1, output: 10 },
    description: "Latest GPT series",
  },
  {
    id: "openai/gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "code"],
    pricing: { input: 1, output: 10 },
    description: "Code-optimized 5.1",
  },
  {
    id: "openai/gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    provider: "openai",
    contextWindow: 400000,
    capabilities: ["chat", "code"],
    pricing: { input: 0.25, output: 2 },
    description: "Efficient code model",
  },

  // o-Series Reasoning Models
  {
    id: "openai/o1",
    name: "o1",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 15, output: 60 },
    description: "Chain-of-thought reasoning",
  },
  {
    id: "openai/o1-mini",
    name: "o1 Mini",
    provider: "openai",
    contextWindow: 128000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 1, output: 4 },
    description: "Efficient reasoning",
  },
  {
    id: "openai/o1-pro",
    name: "o1 Pro",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 150, output: 600 },
    description: "Most capable o1",
  },
  {
    id: "openai/o3",
    name: "o3",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 2, output: 8 },
    description: "Advanced reasoning",
  },
  {
    id: "openai/o3-mini",
    name: "o3 Mini",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 1, output: 4 },
    description: "Efficient o3",
  },
  {
    id: "openai/o3-pro",
    name: "o3 Pro",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 20, output: 80 },
    description: "Enhanced o3",
  },
  {
    id: "openai/o4-mini",
    name: "o4 Mini",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "code"],
    pricing: { input: 1, output: 4 },
    description: "Latest reasoning model",
  },

  // Legacy Models
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 10, output: 30 },
    description: "GPT-4 with vision",
  },
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16000,
    capabilities: ["chat", "code"],
    pricing: { input: 0.50, output: 2 },
    description: "Fast and affordable",
  },

  // Embedding Models
  {
    id: "openai/text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    contextWindow: 8000,
    capabilities: ["embedding"],
    pricing: { input: 0.13, output: 0 },
    description: "Best quality embeddings",
  },
  {
    id: "openai/text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    contextWindow: 8000,
    capabilities: ["embedding"],
    pricing: { input: 0.02, output: 0 },
    description: "Efficient embeddings",
  },

  // Codex
  {
    id: "openai/codex-mini-latest",
    name: "Codex Mini",
    provider: "openai",
    contextWindow: 200000,
    capabilities: ["chat", "code"],
    pricing: { input: 2, output: 6 },
    description: "Code-optimized model",
  },
];
