import { mastra } from "@/src/mastra"; // Import the Mastra instance
import { Readable } from "node:stream";

export async function POST(req: Request) {
  // Get the audio file from the request
  const formData = await req.formData();
  const audioFile = formData.get("audio") as File;
  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const readable = Readable.from(buffer);

  // Get the note taker agent from the Mastra instance
  const noteTakerAgent = mastra.getAgent("noteTakerAgent");

  // Transcribe the audio file
  const text = await noteTakerAgent.voice?.listen(readable);

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
}
