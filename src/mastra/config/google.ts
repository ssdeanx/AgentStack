import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { logError } from './logger'
//import { GoogleAICacheManager } from '@google/generative-ai/server';
//import { GoogleVoice } from "@mastra/voice-google";
import { GoogleGenerativeAIImageProviderOptions } from '@ai-sdk/google';
import { experimental_generateImage as generateImage } from 'ai';

// Initialize with custom configuration
//export const gvoice = new GoogleVoice({
//  speechModel: {
//    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "your-speech-api-key",
//  },
//  listeningModel: {
//    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "your-speech-api-key",
//  },
//  speaker: "en-US-Casual-K",
//});

// Text-to-Speech
//const audioStream = await gvoice.speak("Hello, world!", {
//  languageCode: "en-US",
//  audioConfig: {
//    audioEncoding: "LINEAR16",
//  },
//});

// Speech-to-Text
//export const transcript = await gvoice.listen(audioStream, {
//  config: {
//    encoding: "LINEAR16",
//    languageCode: "en-US",
//  },
//});

// Get available voices for a specific language
//export const voices = await gvoice.getSpeakers({ languageCode: "en-US" });

//export const cacheManager = new GoogleAICacheManager(
//  process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '',
//);

export const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})
// Gemini 2.5 Flash model for general-purpose applications
/*
 * googleAI: Main Gemini 2.5 Flash model for general-purpose applications
    * When to use: This model is suitable for a wide range of tasks including text generation, reasoning, and vision-related applications. It offers a good balance between performance and cost, making it ideal for most standard use cases.
    * Why use: Choose this model when you need reliable performance for diverse applications without the higher costs associated with premium models.
 */
// Note: The google() factory expects only the model id. Per-model provider options
// such as `structuredOutputs` should be configured at the provider level (when
// creating the Google AI instance) if supported by the SDK. Remove the second
// argument to match the current function signature.
export const googleAI = google('gemini-2.5-flash-preview-09-2025')
// Gemini 2.5 Pro model for higher-performance applications
/*
 * googleAIPro: Gemini 3 Pro model for higher-performance applications
    * When to use: This model is designed for applications that require enhanced reasoning capabilities, more complex text generation, and advanced vision tasks. It is ideal for scenarios where quality and depth of response are critical.
    * Why use: Opt for this model when your application demands superior performance and can benefit from the advanced features it offers, despite the higher associated costs.
 */
export const googleAIPro = google('gemini-3-pro-preview')
// Gemini 2.5 Flash Lite model for free-tier applications
/*
 * googleAIFlashLite: Gemini 2.5 Flash Lite model for free-tier applications
    * When to use: This model is suitable for applications with basic text generation and reasoning needs, especially when operating under budget constraints or within a free-tier usage plan.
    * Why use: Select this model when you need to minimize costs while still leveraging the capabilities of the Gemini series for simpler tasks.
 */
export const googleAIFlashLite = google('gemini-2.5-flash-lite-preview-09-2025')
// Gemini Embedding 001 model for generating text embeddings
/*
 * googleAIEmbedding: Gemini Embedding 001 model for generating text embeddings
    * When to use: This model is ideal for tasks that require the conversion of text into high-dimensional vector representations, such as semantic search, clustering, and recommendation systems.
    * Why use: Utilize this model when you need efficient and effective text embeddings to enhance the performance of applications involving natural language understanding and information retrieval.
 */
export const googleAIEmbedding = google.textEmbedding('gemini-embedding-001')
// Gemini Computer Use model for tasks requiring higher accuracy and reliability
/*
 * googleAIComputerUse: Gemini Computer Use model for tasks requiring higher accuracy and reliability
    * When to use: This model is tailored for applications that demand precise and dependable outputs, such as critical decision-making systems, technical content generation, and scenarios where accuracy is paramount.
    * Why use: Choose this model when the quality and reliability of the generated content are crucial to your application's success, even if it comes with increased computational costs.
 */
export const googleAIComputerUse = google('gemini-2.5-computer-use-preview-10-2025')
export const googleAI3 = google('gemini-2.5-flash-preview-09-2025')

// Gemini Nano Banana model for low-cost image generation
/*
 * googleAINanoBanana: Gemini Nano Banana model for low-cost image generation
    * When to use: This model is optimized for generating images at a lower cost, making it suitable for applications where budget constraints are a priority, and high-resolution images are not essential.
    * Why use: Opt for this model when you need to produce images affordably, especially for applications like social media content, basic visualizations, or scenarios where image quality can be compromised for cost savings.
 */
export const googleAINanoBanana = google('gemini-2.5-flash-image')
export const googleNanoBanana = google('gemini-3-pro-image-preview')

//const model = 'gemini-2.5-flash-preview-09-2025';

//const { name: cachedContent } = await cacheManager.create({
//  model,
//  contents: [
//    {
//      role: 'user',
//      parts: [{ text: 'Research Topics, Insights Gained, New Information' }],
//    },
//  ],
//  ttlSeconds: 60 * 5,
//  tools: [],
//  systemInstruction: 'This is model has cache',
//  displayName: 'cacheContent',
//});

export const imageGen = google.image('imagen-4.0-generate-001');

export const imageUltra = google.image('imagen-4.0-ultra-generate-001');

export const imageFast = google.image('imagen-4.0-fast-generate-001');

/*
 * googleWithMemory: Google Generative AI model integrated with Supermemory for enhanced conversational capabilities
      * When to use: This configuration is ideal for applications that require context-aware interactions, such as chatbots, virtual assistants, and customer support systems. It leverages Supermemory to provide relevant historical context in conversations.
      * Why use: Utilize this setup when you want to enhance user interactions by incorporating past conversations and relevant information, leading to more personalized and accurate responses.
      * Example use cases:
         * A customer support chatbot that remembers previous interactions with users to provide tailored assistance.
         * A virtual assistant that maintains context across multiple user requests for more coherent interactions.
         * An educational tutor bot that recalls past lessons and user progress to adapt its teaching approach.
         * A travel planning assistant that considers past queries about destinations and preferences to suggest personalized itineraries.
         * A medical consultation tool that takes into account patient history and previous consultations to offer more informed advice.
      * Configuration details: This setup uses the 'mastra' container tag for memory search, includes a conversation ID for grouping messages, and operates in 'full' mode to maximize context retrieval. It is configured to always add relevant memories to the prompts.
*/
export const googleWithMemory = withSupermemory(googleAI,"mastra", {
   conversationId: "mastra-conversation",
   verbose: true,
   mode: "full",
   addMemory: "always"
});