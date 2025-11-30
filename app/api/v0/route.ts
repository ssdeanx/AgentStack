import { v0 } from 'v0-sdk';

export async function POST(req: Request) {
    const { prompt }: { prompt: string } = await req.json();
    const result = await v0.chats.create({
        system: 'You are an expert coder',
        message: prompt,
        modelConfiguration: {
            modelId: 'v0-1.5-sm',
            imageGenerations: false,
            thinking: false,
        },
    });
    return Response.json(result);
}
