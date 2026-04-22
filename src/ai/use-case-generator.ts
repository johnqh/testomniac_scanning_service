import type OpenAI from "openai";

export interface UseCaseResult {
  name: string;
  description: string;
}

export async function generateUseCases(
  client: OpenAI,
  personaName: string,
  personaDescription: string,
  siteSummary: string,
  pageContents: string[]
): Promise<UseCaseResult[]> {
  const prompt = `For the persona "${personaName}" (${personaDescription}) on this website, identify specific use cases — goals this user would try to accomplish.

Site summary: ${siteSummary}

Pages available:
${pageContents
  .slice(0, 10)
  .map((c, i) => `Page ${i + 1}: ${c.slice(0, 300)}`)
  .join("\n\n")}

Respond with a JSON object with a "useCases" key containing an array of objects with "name" and "description" fields. 2-8 use cases.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || '{"useCases":[]}';
  const parsed = JSON.parse(content);
  return parsed.useCases || parsed.use_cases || [];
}
