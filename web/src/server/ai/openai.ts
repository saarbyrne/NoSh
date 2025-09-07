import { VisionOutputSchema, GoalsOutputSchema, type VisionOutputT, type GoalsOutputT } from "@/lib/schemas";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. OpenAI fallback will not work.");
}

async function callOpenAI(prompt: string, photoUrl?: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const messages: any[] = [{ role: "user", content: prompt }];

  if (photoUrl) {
    messages[0].content = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: photoUrl,
        },
      },
    ];
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o", // Or gpt-4-vision-preview for vision tasks
      messages: messages,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content received from OpenAI.");
  }
  return JSON.parse(content);
}

export async function analyzeImage({ signedUrl }: { signedUrl: string }): Promise<VisionOutputT> {
  const prompt = `Identify foods/drinks in this image.
Return strict JSON:
{
  "photo_id": string,
  "items": [
    { "raw_label": string, "confidence": number, "packaged": boolean, "taxonomy_category": string }
  ],
  "ocr_text": string | undefined
}
- confidence is between 0 and 1
- packaged=true if it's a commercial product
- taxonomy_category should be one of: fruit, vegetables, whole grains, refined grains, dairy, protein, nuts/seeds, legumes, oils, sugary drinks, processed meats, oily fish, other
- ocr_text should contain any detected text from packaging or labels`;

  let result;
  for (let i = 0; i < 2; i++) { // 1 retry
    try {
      result = await callOpenAI(prompt, signedUrl);
      return VisionOutputSchema.parse(result);
    } catch (error) {
      if (i === 0) console.warn("OpenAI analyzeImage validation failed, retrying...", error);
      else throw error;
    }
  }
  throw new Error("Failed to analyze image with OpenAI after retries.");
}

export async function generateGoals({ monthSummaryJson }: { monthSummaryJson: string }): Promise<GoalsOutputT> {
  const instructions = `You are a nutrition assistant. Based on these category totals for the past 3 days, write 3 simple, actionable goals. Keep them realistic, specific, and kind.

Totals JSON:
${monthSummaryJson}

Return strict JSON with this schema:
{
  "goals": [
    {"title": string (<=60), "why": string (<=120), "how": string (<=200), "fallback": string (<=120)}
  ]
}`;

  let result;
  for (let i = 0; i < 2; i++) { // 1 retry
    try {
      result = await callOpenAI(instructions);
      return GoalsOutputSchema.parse(result);
    } catch (error) {
      if (i === 0) console.warn("OpenAI generateGoals validation failed, retrying...", error);
      else throw error;
    }
  }
  throw new Error("Failed to generate goals with OpenAI after retries.");
}
