/**
 * Ollama Local Models Configuration
 * Models available when running Ollama locally
 */

import type { ModelConfig, ProviderConfig } from './models';

export const OLLAMA_PROVIDER_CONFIG: ProviderConfig = {
  id: "ollama",
  name: "Ollama",
  logo: "llama",
  envKey: "OLLAMA_BASE_URL",
};

export const OLLAMA_MODELS: ModelConfig[] = [
  // Llama Series
  {
    id: "ollama/llama3.2",
    name: "Llama 3.2 (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "code"],
    description: "Latest Llama locally",
  },
  {
    id: "ollama/llama3.1",
    name: "Llama 3.1 (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "code"],
    description: "Stable Llama locally",
  },
  {
    id: "ollama/llama3.1:70b",
    name: "Llama 3.1 70B (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "reasoning", "code"],
    description: "Large Llama locally",
  },
  {
    id: "ollama/llama3.2-vision",
    name: "Llama 3.2 Vision (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "vision", "code"],
    description: "Vision-capable Llama",
  },

  // Code-focused Models
  {
    id: "ollama/codellama",
    name: "Code Llama (Local)",
    provider: "ollama",
    contextWindow: 16000,
    capabilities: ["code"],
    description: "Code-focused model",
  },
  {
    id: "ollama/codellama:34b",
    name: "Code Llama 34B (Local)",
    provider: "ollama",
    contextWindow: 16000,
    capabilities: ["code"],
    description: "Large code model",
  },
  {
    id: "ollama/qwen2.5-coder",
    name: "Qwen 2.5 Coder (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["code"],
    description: "Qwen coding model",
  },
  {
    id: "ollama/qwen2.5-coder:32b",
    name: "Qwen 2.5 Coder 32B (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["code"],
    description: "Large Qwen coder",
  },
  {
    id: "ollama/deepseek-coder-v2",
    name: "DeepSeek Coder V2 (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["code"],
    description: "DeepSeek coding",
  },
  {
    id: "ollama/starcoder2",
    name: "StarCoder 2 (Local)",
    provider: "ollama",
    contextWindow: 16000,
    capabilities: ["code"],
    description: "StarCoder for code",
  },

  // Mistral Series
  {
    id: "ollama/mistral",
    name: "Mistral (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["chat", "code"],
    description: "Efficient Mistral",
  },
  {
    id: "ollama/mistral-nemo",
    name: "Mistral Nemo (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "code"],
    description: "Extended context Mistral",
  },
  {
    id: "ollama/mixtral",
    name: "Mixtral (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["chat", "code"],
    description: "MoE Mistral",
  },

  // Qwen Chat Series
  {
    id: "ollama/qwen2.5",
    name: "Qwen 2.5 (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["chat", "code"],
    description: "Qwen chat model",
  },
  {
    id: "ollama/qwen2.5:72b",
    name: "Qwen 2.5 72B (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["chat", "reasoning", "code"],
    description: "Large Qwen",
  },
  {
    id: "ollama/qwq",
    name: "QwQ (Local)",
    provider: "ollama",
    contextWindow: 32000,
    capabilities: ["chat", "reasoning", "code"],
    description: "Reasoning Qwen",
  },

  // Gemma Series
  {
    id: "ollama/gemma2",
    name: "Gemma 2 (Local)",
    provider: "ollama",
    contextWindow: 8000,
    capabilities: ["chat", "code"],
    description: "Google Gemma locally",
  },
  {
    id: "ollama/gemma2:27b",
    name: "Gemma 2 27B (Local)",
    provider: "ollama",
    contextWindow: 8000,
    capabilities: ["chat", "code"],
    description: "Large Gemma",
  },

  // DeepSeek Reasoning
  {
    id: "ollama/deepseek-r1",
    name: "DeepSeek R1 (Local)",
    provider: "ollama",
    contextWindow: 64000,
    capabilities: ["chat", "reasoning", "code"],
    description: "Reasoning model locally",
  },
  {
    id: "ollama/deepseek-r1:14b",
    name: "DeepSeek R1 14B (Local)",
    provider: "ollama",
    contextWindow: 64000,
    capabilities: ["chat", "reasoning", "code"],
    description: "Compact reasoning",
  },

  // Phi Series
  {
    id: "ollama/phi3",
    name: "Phi-3 (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "code"],
    description: "Microsoft Phi-3",
  },
  {
    id: "ollama/phi3:medium",
    name: "Phi-3 Medium (Local)",
    provider: "ollama",
    contextWindow: 128000,
    capabilities: ["chat", "code"],
    description: "Larger Phi-3",
  },

  // Embedding Models
  {
    id: "ollama/nomic-embed-text",
    name: "Nomic Embed (Local)",
    provider: "ollama",
    contextWindow: 8192,
    capabilities: ["embedding"],
    description: "Text embeddings",
  },
  {
    id: "ollama/mxbai-embed-large",
    name: "mxbai Embed Large (Local)",
    provider: "ollama",
    contextWindow: 512,
    capabilities: ["embedding"],
    description: "Large embeddings",
  },
];
