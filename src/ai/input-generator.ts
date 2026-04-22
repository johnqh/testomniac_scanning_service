import type OpenAI from "openai";
import type { FormField } from "../domain/types";

export interface InputValueResult {
  fieldSelector: string;
  fieldName: string;
  value: string;
}

export async function generateInputValues(
  client: OpenAI,
  personaName: string,
  useCaseName: string,
  fields: FormField[]
): Promise<InputValueResult[]> {
  const fieldDescriptions = fields
    .map(
      f =>
        `selector: "${f.selector}", name: "${f.name}", type: "${f.type}", label: "${f.label}", required: ${f.required}${f.options ? `, options: [${f.options.join(", ")}]` : ""}`
    )
    .join("\n");

  const prompt = `For the persona "${personaName}" performing the use case "${useCaseName}", generate realistic form input values for these fields:

${fieldDescriptions}

Respond with a JSON object with a "values" key containing an array of objects with "fieldSelector", "fieldName", and "value" fields. Use realistic data appropriate for this persona and use case.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || '{"values":[]}';
  const parsed = JSON.parse(content);
  return parsed.values || parsed.inputValues || [];
}
