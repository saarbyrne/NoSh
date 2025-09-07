import { VisionOutputSchema, GoalsOutputSchema, type VisionOutputT, type GoalsOutputT } from "@/lib/schemas";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI functions may not work.");
}

async function callGemini(prompt: string, photoUrl?: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const parts: { text: string }[] = [{ text: prompt }];
  if (photoUrl) {
    parts.push({ text: `photo_url: ${photoUrl}` });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: "application/json" },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${text}`);
  }

  let root: any;
  try {
    root = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse Gemini upstream JSON: ${text}`);
  }

  // Gemini often wraps the strict JSON in a text field
  try {
    const innerText = root?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof innerText === "string") {
      return JSON.parse(innerText);
    }
  } catch (_e) {
    // Fallback to root if inner parsing fails
  }
  return root;
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
      result = await callGemini(prompt, signedUrl);
      // Validate with Zod
      return VisionOutputSchema.parse(result);
    } catch (error) {
      if (i === 0) console.warn("Gemini analyzeImage validation failed, retrying...", error);
      else throw error;
    }
  }
  throw new Error("Failed to analyze image after retries.");
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
      result = await callGemini(instructions);
      // Validate with Zod
      return GoalsOutputSchema.parse(result);
    } catch (error) {
      if (i === 0) console.warn("Gemini generateGoals validation failed, retrying...", error);
      else throw error;
    }
  }
  throw new Error("Failed to generate goals after retries.");
}
