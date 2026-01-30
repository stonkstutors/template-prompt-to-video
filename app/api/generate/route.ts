import { generateVideo } from "@/lib/generation-service";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { title, topic } = await request.json();

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

  if (!openaiApiKey || !elevenlabsApiKey) {
    return new Response(
      JSON.stringify({
        error: "API keys not configured. Please set OPENAI_API_KEY and ELEVENLABS_API_KEY.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!title || !topic) {
    return new Response(
      JSON.stringify({ error: "Title and topic are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step: string, progress: number, detail?: string) => {
        const data = JSON.stringify({ step, progress, detail });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const { slug } = await generateVideo(
          title,
          topic,
          openaiApiKey,
          elevenlabsApiKey,
          sendProgress
        );

        const doneData = JSON.stringify({ done: true, slug });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorData = JSON.stringify({ error: errorMessage });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
