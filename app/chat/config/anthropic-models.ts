/**
 * Anthropic Models Configuration
 * Based on https://mastra.ai/models/providers/anthropic
 */

import type { ModelConfig, ProviderConfig } from './models';

export const ANTHROPIC_PROVIDER_CONFIG: ProviderConfig = {
  id: "anthropic",
  name: "Anthropic",
  logo: "anthropic",
  envKey: "ANTHROPIC_API_KEY",
};

export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Claude 4.5 Series (Latest)
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "Latest Claude with excellent reasoning",
    isDefault: true,
  },
  {
    id: "anthropic/claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 5, output: 25 },
    description: "Most capable Claude",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 1, output: 5 },
    description: "Fast and efficient Claude",
  },
  {
    id: "anthropic/claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5 (Oct 2025)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 1, output: 5 },
    description: "October 2025 snapshot",
  },

  // Claude 4.1 Series
  {
    id: "anthropic/claude-opus-4-1",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 75 },
    description: "Advanced reasoning capabilities",
  },
  {
    id: "anthropic/claude-opus-4-1-20250805",
    name: "Claude Opus 4.1 (Aug 2025)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 75 },
    description: "August 2025 snapshot",
  },

  // Claude 4.0 Series
  {
    id: "anthropic/claude-sonnet-4-0",
    name: "Claude Sonnet 4.0",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "Balanced performance",
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4.0 (May 2025)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "May 2025 snapshot",
  },
  {
    id: "anthropic/claude-opus-4-0",
    name: "Claude Opus 4.0",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 75 },
    description: "Previous flagship",
  },
  {
    id: "anthropic/claude-opus-4-20250514",
    name: "Claude Opus 4.0 (May 2025)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 75 },
    description: "May 2025 snapshot",
  },

  // Claude 3.7 Series
  {
    id: "anthropic/claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "Latest 3.7 Sonnet",
  },
  {
    id: "anthropic/claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet (Feb 2025)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "February 2025 snapshot",
  },

  // Claude 3.5 Series
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "Excellent balance",
  },
  {
    id: "anthropic/claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.80, output: 4 },
    description: "Fast and efficient",
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku (Oct 2024)",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.80, output: 4 },
    description: "October 2024 snapshot",
  },

  // Claude 3 Series (Legacy)
  {
    id: "anthropic/claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 15, output: 75 },
    description: "Original flagship",
  },
  {
    id: "anthropic/claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "reasoning", "vision", "code"],
    pricing: { input: 3, output: 15 },
    description: "Balanced Claude 3",
  },
  {
    id: "anthropic/claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    capabilities: ["chat", "vision", "code"],
    pricing: { input: 0.25, output: 1 },
    description: "Fast Claude 3",
  },
];
