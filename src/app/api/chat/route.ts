import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getSessionUser } from "@/lib/supabase/auth";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response("OPENAI_API_KEY is not configured", { status: 500 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a helpful compliance assistant for Been, a platform for testing, inspection, certification, and compliance of industrial assets. Answer clearly and concisely. When unsure, say so rather than guessing.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
