import { VisionOutput, GoalsOutput } from "../schemas";

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-1.5-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  }

  async analyzeImage({ signedUrl }: { signedUrl: string }): Promise<VisionOutput> {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    
    const prompt = `Identify foods/drinks in this image. Be thorough and accurate.
Return strict JSON with this exact schema:
{
  "photo_id": "string",
  "items": [
    {
      "raw_label": "string",
      "confidence": number (0-1),
      "packaged": boolean,
      "taxonomy_category": "string"
    }
  ],
  "ocr_text": "string (optional)"
}

Rules:
- confidence is between 0 and 1
- packaged=true if it's a commercial product with visible packaging
- taxonomy_category must be one of: fruit, vegetables, high-fibre cereals, low-fibre cereals, sugary drinks, water, oily fish, white fish, processed meats, unprocessed meats, plant proteins, dairy, nuts & seeds, sweets & desserts, fried foods, whole grains, refined grains, coffee/tea (unsweetened), coffee/tea (sweetened)
- If you see text on packaging, include it in ocr_text
- Be specific with raw_label (e.g., "red apple" not just "apple")
- Return only valid JSON, no other text`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { 
              inline_data: {
                mime_type: "image/jpeg",
                data: await this.getImageData(signedUrl)
              }
            }
          ],
        },
      ],
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 2048
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract JSON from Gemini response
    let jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No response text from Gemini");
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Invalid JSON from Gemini: ${jsonText}`);
    }

    // Validate with Zod schema
    const validated = VisionOutput.parse(parsed);
    return validated;
  }

  async generateGoals({ monthSummaryJson }: { monthSummaryJson: string }): Promise<GoalsOutput> {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    
    const instructions = `You are a compassionate nutrition assistant. Based on the user's food consumption patterns over 3 days, generate 3 personalized, actionable nutrition goals.

Month Summary Data:
${monthSummaryJson}

Return strict JSON with this exact schema:
{
  "goals": [
    {
      "title": "string (max 60 chars)",
      "why": "string (max 120 chars)",
      "how": "string (max 200 chars)",
      "fallback": "string (max 120 chars)"
    }
  ]
}

Guidelines:
- Make goals realistic, specific, and achievable
- Be encouraging and non-judgmental
- Focus on adding healthy foods rather than restricting
- Consider the user's current patterns
- Provide practical, actionable steps
- Include a fallback option for each goal
- Keep language simple and motivating
- Return only valid JSON, no other text`;

    const payload = {
      contents: [{ parts: [{ text: instructions }] }],
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1024
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract JSON from Gemini response
    let jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No response text from Gemini");
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Invalid JSON from Gemini: ${jsonText}`);
    }

    // Validate with Zod schema
    const validated = GoalsOutput.parse(parsed);
    return validated;
  }

  private async getImageData(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return base64;
    } catch (error) {
      throw new Error(`Error processing image: ${(error as Error).message}`);
    }
  }

  // Retry logic for failed requests
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          console.log(`Attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError!;
  }
}

// Factory function for creating client
export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient({ apiKey });
}
