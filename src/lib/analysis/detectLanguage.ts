import { z } from "zod";
import { openai } from "@/lib/openai";

export type DetectedLanguage = "uk" | "ru" | "en" | "uk_ru" | "other";

const DetectionSchema = z.object({
  detected: z.enum(["uk", "ru", "en", "uk_ru", "other"]),
  languageName: z.string(),
});

const DETECTION_PROMPT = `You are a language detection specialist for call center transcripts.

Identify the primary language(s) used in the transcript.

Return ONLY valid JSON (no markdown, no explanations):
{
  "detected": "uk" | "ru" | "en" | "uk_ru" | "other",
  "languageName": "full English name of the language"
}

Detection rules:
- "uk"    → transcript is primarily Ukrainian
- "ru"    → transcript is primarily Russian
- "en"    → transcript is primarily English
- "uk_ru" → transcript code-switches between Ukrainian and Russian
- "other" → any other language; set languageName to its English name (e.g. "German", "Polish")

languageName for supported languages:
- "uk"    → "Ukrainian"
- "ru"    → "Russian"
- "en"    → "English"
- "uk_ru" → "Ukrainian/Russian"`;

export async function detectCallLanguage(transcript: string): Promise<{
  detected: DetectedLanguage;
  languageName: string;
}> {
  const sample = transcript.slice(0, 1500);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DETECTION_PROMPT },
      { role: "user", content: `Transcript:\n\n${sample}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty language detection response");

  return DetectionSchema.parse(JSON.parse(content));
}
