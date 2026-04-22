import type OpenAI from "openai";

export interface PersonaResult {
  name: string;
  description: string;
}

export async function generatePersonas(
  client: OpenAI,
  siteSummary: string,
  pageContents: string[]
): Promise<PersonaResult[]> {
  const prompt = `You are analyzing a website. Based on the following site content, identify the distinct types of users (personas) who would use this site. For each persona, provide a name and a brief description.

Site summary: ${siteSummary}

Page contents (sampled):
${pageContents
  .slice(0, 10)
  .map((c, i) => `Page ${i + 1}: ${c.slice(0, 500)}`)
  .join("\n\n")}

Respond with a JSON object with a "personas" key containing an array of objects with "name" and "description" fields. Minimum 1 persona, maximum 5.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || '{"personas":[]}';
  const parsed = JSON.parse(content);
  return parsed.personas || [];
}
