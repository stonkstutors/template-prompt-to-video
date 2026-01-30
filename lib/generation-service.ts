import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api";

export const IMAGE_WIDTH = 1024;
export const IMAGE_HEIGHT = 1792;

export const StoryScript = z.object({
  text: z.string(),
});

export const StoryWithImages = z.object({
  result: z.array(
    z.object({
      text: z.string(),
      imageDescription: z.string(),
    })
  ),
});

export interface ContentItemWithDetails {
  text: string;
  imageDescription: string;
  uid: string;
  audioTimestamps: CharacterAlignmentResponseModel;
}

export interface StoryMetadataWithDetails {
  shortTitle: string;
  content: ContentItemWithDetails[];
}

export interface ElementAnimation {
  type: "scale";
  from: number;
  to: number;
  startMs: number;
  endMs: number;
}

export interface BackgroundElement {
  startMs: number;
  endMs: number;
  imageUrl: string;
  enterTransition?: "fade" | "blur" | "none";
  exitTransition?: "fade" | "blur" | "none";
  animations?: ElementAnimation[];
}

export interface TextElement {
  startMs: number;
  endMs: number;
  text: string;
  position: "top" | "bottom" | "center";
  animations?: ElementAnimation[];
}

export interface AudioElement {
  startMs: number;
  endMs: number;
  audioUrl: string;
}

export interface Timeline {
  shortTitle: string;
  elements: BackgroundElement[];
  text: TextElement[];
  audio: AudioElement[];
}

export type ProgressCallback = (step: string, progress: number, detail?: string) => void;

export async function openaiStructuredCompletion<T>(
  prompt: string,
  schema: z.ZodType<T>,
  apiKey: string
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema) as any;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: {
            type: jsonSchema.type || "object",
            properties: jsonSchema.properties,
            required: jsonSchema.required,
            additionalProperties: jsonSchema.additionalProperties ?? false,
          },
          strict: true,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content);
  return schema.parse(parsed);
}

export async function generateAiImage({
  prompt,
  filePath,
  apiKey,
  onRetry,
}: {
  prompt: string;
  filePath: string;
  apiKey: string;
  onRetry?: (attempt: number) => void;
}) {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`,
        response_format: "b64_json",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const buffer = Buffer.from(data.data[0].b64_json, "base64");
      await fs.writeFile(filePath, buffer);
      return;
    } else {
      lastError = new Error(
        `OpenAI error (attempt ${attempt + 1}): ${await res.text()}`
      );
      attempt++;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        onRetry?.(attempt);
      }
    }
  }

  throw lastError!;
}

export async function generateVoice(
  text: string,
  apiKey: string,
  filePath: string
): Promise<CharacterAlignmentResponseModel> {
  const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
    apiKey,
  });

  const voiceId = "21m00Tcm4TlvDq8ikWAM";

  const data = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text,
  });

  if (!data.alignment || !data.alignment.characterEndTimesSeconds.length) {
    throw new Error("ElevenLabs response missing timestamps");
  }

  const buffer = Buffer.from(data.audioBase64, "base64");
  await fs.writeFile(filePath, buffer);
  return data.alignment;
}

function getSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBgAnimations(durationMs: number, zoomIn: boolean): ElementAnimation[] {
  const animations: ElementAnimation[] = [];
  const startMs = 0;
  const endMs = durationMs;
  const scaleFrom = zoomIn ? 1.5 : 1;
  const scaleTo = zoomIn ? 1 : 1.5;

  animations.push({
    type: "scale",
    from: scaleFrom,
    to: scaleTo,
    startMs,
    endMs,
  });

  return animations;
}

function getTextAnimations(): ElementAnimation[] {
  const animations: ElementAnimation[] = [];
  const durationMs = 300;
  const startMs = 0;
  const endMs = durationMs;

  const startScale = Math.random() * 0.2 + 0.5;
  const dontScale = Math.random() > 0.6;
  const bounces = Math.random() > 0.5;

  animations.push({
    type: "scale",
    from: dontScale ? 1 : startScale,
    to: bounces ? 1.25 : 1,
    startMs,
    endMs,
  });

  if (bounces) {
    animations.push({
      type: "scale",
      from: 1.25,
      to: 1,
      startMs: endMs,
      endMs: endMs + 200,
    });
  }

  return animations;
}

function createTimelineFromStory(storyWithDetails: StoryMetadataWithDetails): Timeline {
  const timeline: Timeline = {
    elements: [],
    text: [],
    audio: [],
    shortTitle: storyWithDetails.shortTitle,
  };

  let durationMs = 0;
  let zoomIn = true;

  for (let i = 0; i < storyWithDetails.content.length; i++) {
    const content = storyWithDetails.content[i];

    const lenMs = Math.ceil(
      content.audioTimestamps.characterEndTimesSeconds[
        content.audioTimestamps.characterEndTimesSeconds.length - 1
      ] * 1000
    );

    const bgElem: BackgroundElement = {
      startMs: durationMs,
      endMs: durationMs + lenMs,
      imageUrl: content.uid,
      enterTransition: "blur",
      exitTransition: "blur",
      animations: getBgAnimations(lenMs, zoomIn),
    };

    timeline.elements.push(bgElem);
    timeline.audio.push({
      startMs: durationMs,
      endMs: durationMs + lenMs,
      audioUrl: content.uid,
    });

    const words = content.text.split(" ");
    const {
      characterStartTimesSeconds: character_start_times_seconds,
      characterEndTimesSeconds: character_end_times_seconds,
    } = content.audioTimestamps;

    const MaxSentenseSizeChars = 14;

    let currentText = "";
    let currentStartMs = character_start_times_seconds[0] * 1000 + durationMs;
    let currentEndMs = durationMs;
    let currentCharIndex = 0;

    for (const word of words) {
      if ((currentText + word).length > MaxSentenseSizeChars) {
        const textElem: TextElement = {
          startMs: currentStartMs,
          endMs: currentEndMs,
          text: currentText.trim(),
          position: "center",
          animations: getTextAnimations(),
        };

        timeline.text.push(textElem);

        currentText = "";
        currentStartMs = currentEndMs;
      }

      currentText += `${word} `;
      for (let j = 0; j < word.length; j++) {
        currentEndMs =
          character_end_times_seconds[currentCharIndex] * 1000 + durationMs;
        currentCharIndex++;
      }

      currentEndMs =
        character_end_times_seconds[currentCharIndex] * 1000 + durationMs;
      currentCharIndex++;
    }

    if (currentText.trim().length > 0) {
      const textElem: TextElement = {
        startMs: currentStartMs,
        endMs:
          character_end_times_seconds[character_end_times_seconds.length - 1] *
            1000 +
          durationMs,
        text: currentText.trim(),
        position: "center",
        animations: getTextAnimations(),
      };

      timeline.text.push(textElem);
    }

    durationMs += lenMs;
    zoomIn = !zoomIn;
  }

  return timeline;
}

export async function generateVideo(
  title: string,
  topic: string,
  openaiApiKey: string,
  elevenlabsApiKey: string,
  onProgress: ProgressCallback
): Promise<{ slug: string; timeline: Timeline }> {
  const slug = getSlug(title);
  const baseDir = path.join(process.cwd(), "public", "content", slug);
  const imagesDir = path.join(baseDir, "images");
  const audioDir = path.join(baseDir, "audio");

  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });

  onProgress("story", 0, "Gerando historia...");

  const storyPrompt = `Write a short story with title [${title}] (its topic is [${topic}]).
   You must follow best practices for great storytelling. 
   The script must be 8-10 sentences long. 
   Story events can be from anywhere in the world, but text must be translated into English language. 
   Result result without any formatting and title, as one continuous text. 
   Skip new lines.`;

  const storyRes = await openaiStructuredCompletion(storyPrompt, StoryScript, openaiApiKey);
  onProgress("story", 100, "Historia gerada!");

  onProgress("descriptions", 0, "Gerando descricoes de imagens...");

  const descriptionPrompt = `You are given story text.
  Generate (in English) 5-8 very detailed image descriptions for this story. 
  Return their description as json array with story sentences matched to images. 
  Story sentences must be in the same order as in the story and their content must be preserved.
  Each image must match 1-2 sentence from the story.
  Images must show story content in a way that is visually appealing and engaging, not just characters.
  Give output in json format:

  [
    {
      "text": "....",
      "imageDescription": "..."
    }
  ]

  <story>
  ${storyRes.text}
  </story>`;

  const storyWithImagesRes = await openaiStructuredCompletion(
    descriptionPrompt,
    StoryWithImages,
    openaiApiKey
  );
  onProgress("descriptions", 100, "Descricoes geradas!");

  const storyWithDetails: StoryMetadataWithDetails = {
    shortTitle: title,
    content: [],
  };

  for (const item of storyWithImagesRes.result) {
    const contentWithDetails: ContentItemWithDetails = {
      text: item.text,
      imageDescription: item.imageDescription,
      uid: uuidv4(),
      audioTimestamps: {
        characters: [],
        characterStartTimesSeconds: [],
        characterEndTimesSeconds: [],
      },
    };
    storyWithDetails.content.push(contentWithDetails);
  }

  const totalItems = storyWithDetails.content.length;

  for (let i = 0; i < totalItems; i++) {
    const storyItem = storyWithDetails.content[i];
    const imageProgress = Math.round((i / totalItems) * 100);

    onProgress("images", imageProgress, `Gerando imagem ${i + 1} de ${totalItems}...`);

    await generateAiImage({
      prompt: storyItem.imageDescription,
      filePath: path.join(imagesDir, `${storyItem.uid}.png`),
      apiKey: openaiApiKey,
      onRetry: (attempt) => {
        onProgress("images", imageProgress, `Gerando imagem ${i + 1} de ${totalItems} (tentativa ${attempt + 1})...`);
      },
    });

    const audioProgress = Math.round(((i + 0.5) / totalItems) * 100);
    onProgress("audio", audioProgress, `Gerando audio ${i + 1} de ${totalItems}...`);

    const timings = await generateVoice(
      storyItem.text,
      elevenlabsApiKey,
      path.join(audioDir, `${storyItem.uid}.mp3`)
    );
    storyItem.audioTimestamps = timings;
  }

  onProgress("images", 100, "Imagens geradas!");
  onProgress("audio", 100, "Audios gerados!");

  onProgress("timeline", 0, "Criando timeline final...");

  const timeline = createTimelineFromStory(storyWithDetails);

  await fs.writeFile(
    path.join(baseDir, "descriptor.json"),
    JSON.stringify(storyWithDetails, null, 2)
  );

  await fs.writeFile(
    path.join(baseDir, "timeline.json"),
    JSON.stringify(timeline, null, 2)
  );

  onProgress("timeline", 100, "Timeline criada!");
  onProgress("complete", 100, "Video gerado com sucesso!");

  return { slug, timeline };
}
