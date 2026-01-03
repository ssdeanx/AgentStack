import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { logError } from './logger'
import { GoogleVoice } from "@mastra/voice-google";

export const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Google Voice Configuration
export const voice = new GoogleVoice({
  speechModel: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  listeningModel: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  speaker: "en-US-Casual-N",
});

// Chat/Text Models
export const googleChatModels = {
  // Gemini 3 Pro model for higher-performance applications
  gemini3Pro: google('gemini-3-pro-preview'),
  // Gemini 3 Flash model
  gemini3Flash: google('gemini-3-flash-preview'),
  // Gemini 2.5 Pro model for higher-performance applications
  gemini25Pro: google('gemini-2.5-pro'),
  // Gemini 2.5 Flash model for general-purpose applications
  gemini25Flash: google('gemini-2.5-flash-preview-09-2025'),
  // Gemini 2.5 Flash Lite model for free-tier applications
  gemini25FlashLite: google('gemini-2.5-flash-lite-preview-09-2025'),
  // Gemini Computer Use model for tasks requiring higher accuracy and reliability
  gemini25ComputerUse: google('gemini-2.5-computer-use-preview-10-2025'),
  // Additional variants
  gemini25FlashAlt: google('gemini-2.5-flash-preview-09-2025'),
};

// Image Generation Models
export const googleImageModels = {
  // Gemini Flash Image model
  gemini25FlashImage: google('gemini-2.5-flash-image'),
  gemini3ProImage: google('gemini-3-pro-image-preview'),
  // Imagen 4.0 models
  imagen4Generate: google.image('imagen-4.0-generate-001'),
  imagen4Ultra: google.image('imagen-4.0-ultra-generate-001'),
  imagen4Fast: google.image('imagen-4.0-fast-generate-001'),
};

// Embedding Models
export const googleEmbeddingModels = {
  geminiEmbedding001: google.textEmbedding('gemini-embedding-001'),
};

// Model selector functions
export function getGoogleChatModel(modelId: keyof typeof googleChatModels) {
  return googleChatModels[modelId];
}

export function getGoogleImageModel(modelId: keyof typeof googleImageModels) {
  return googleImageModels[modelId];
}

export function getGoogleEmbeddingModel(modelId: keyof typeof googleEmbeddingModels) {
  return googleEmbeddingModels[modelId];
}

// Default models
export const googleAI = googleChatModels.gemini25Flash; // Main Gemini 2.5 Flash
export const googleAIPro = googleChatModels.gemini3Pro; // Gemini 3 Pro
export const google3 = googleChatModels.gemini3Flash; // Gemini 3 Flash
export const googleAIFlashLite = googleChatModels.gemini25FlashLite; // Gemini 2.5 Flash Lite
export const googleAIEmbedding = googleEmbeddingModels.geminiEmbedding001; // Embedding
export const googleAIComputerUse = googleChatModels.gemini25ComputerUse; // Computer Use
export const googleAI3 = googleChatModels.gemini25FlashAlt; // Alternative Flash
export const googleAINanoBanana = googleImageModels.gemini25FlashImage; // Low-cost image
export const googleNanoBanana = googleImageModels.gemini3ProImage; // Pro image
export const imageGen = googleImageModels.imagen4Generate; // Standard image gen
export const imageUltra = googleImageModels.imagen4Ultra; // Ultra image gen
export const imageFast = googleImageModels.imagen4Fast; // Fast image gen

