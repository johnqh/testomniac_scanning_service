import type OpenAI from "openai";
import type { ApiClient } from "../api/client";
import type { FormField } from "../domain/types";
import { generatePersonas } from "./persona-generator";
import { generateUseCases } from "./use-case-generator";
import { generateInputValues } from "./input-generator";

export interface AnalyzerOptions {
  appId: number;
  runId: number;
  forms: Array<{ pageUrl: string; fields: FormField[] }>;
  openaiClient: OpenAI;
  api: ApiClient;
  onComplete?: (personas: string[], useCases: string[]) => void;
}

export async function runAiAnalysis(options: AnalyzerOptions): Promise<void> {
  const { appId, forms, openaiClient: client, api } = options;

  const pages = await api.getPagesByApp(appId);
  const pageContents: string[] = [];
  for (const page of pages) {
    const states = await api.getPageStates(page.id);
    for (const state of states) {
      if (state.contentText && state.contentText.trim().length > 50) {
        pageContents.push(`[${page.url}]\n${state.contentText.slice(0, 1000)}`);
      }
    }
  }

  if (pageContents.length === 0) return;

  const summaryResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Summarize this website in 2-3 sentences based on these page contents:\n\n${pageContents
          .slice(0, 5)
          .map(c => c.slice(0, 500))
          .join("\n\n")}`,
      },
    ],
    temperature: 0.3,
  });
  const siteSummary =
    summaryResponse.choices[0].message.content || "Unknown website";

  const personaResults = await generatePersonas(
    client,
    siteSummary,
    pageContents
  );
  const personaNames: string[] = [];
  const useCaseNames: string[] = [];

  for (const pr of personaResults) {
    const persona = await api.createPersona(appId, pr.name, pr.description);
    personaNames.push(pr.name);

    const ucResults = await generateUseCases(
      client,
      pr.name,
      pr.description,
      siteSummary,
      pageContents
    );

    for (const ucr of ucResults) {
      const useCase = await api.createUseCase(
        persona.id,
        ucr.name,
        ucr.description
      );
      useCaseNames.push(ucr.name);

      for (const form of forms) {
        const textFields = form.fields.filter(f =>
          ["text", "email", "tel", "url", "search", "textarea"].includes(f.type)
        );
        if (textFields.length === 0) continue;

        const ivResults = await generateInputValues(
          client,
          pr.name,
          ucr.name,
          textFields
        );
        for (const iv of ivResults) {
          await api.createInputValue(
            useCase.id,
            iv.fieldSelector,
            iv.fieldName,
            iv.value
          );
        }
      }
    }
  }

  options.onComplete?.(personaNames, useCaseNames);
}
