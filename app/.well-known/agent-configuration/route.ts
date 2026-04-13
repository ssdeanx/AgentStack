import { auth } from "./src/mastra/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const configuration = await auth.api.getAgentConfiguration();
  return NextResponse.json(configuration);
}