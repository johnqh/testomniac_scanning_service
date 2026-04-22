import type { ApiClient } from "../api/client";
import type { ScanConfig, ScanEventHandler } from "./types";
import { runAiAnalysis } from "../ai/analyzer";

export async function runAiAnalysisPhase(
  config: ScanConfig,
  api: ApiClient,
  events: ScanEventHandler
): Promise<void> {
  if (!config.openaiApiKey) {
    return;
  }

  // Dynamically import OpenAI to keep it optional
  const { default: OpenAI } = await import("openai");
  const openaiClient = new OpenAI({ apiKey: config.openaiApiKey });

  // Gather forms from page states
  const pages = await api.getPagesByApp(config.appId);
  const forms: Array<{ pageUrl: string; fields: any[] }> = [];
  for (const page of pages) {
    const states = await api.getPageStates(page.id);
    for (const state of states) {
      const stateForms = await api.getFormsByPageState(state.id);
      for (const form of stateForms) {
        const fields = form.fieldsJson as any[];
        if (fields && fields.length > 0) {
          forms.push({ pageUrl: page.url, fields });
        }
      }
    }
  }

  await runAiAnalysis({
    appId: config.appId,
    runId: config.runId,
    forms,
    openaiClient,
    api,
    onComplete: (_personas, _useCases) => {
      events.onStatsUpdated({
        pagesFound: 0,
        pageStatesFound: 0,
        actionsCompleted: 0,
        issuesFound: 0,
      });
    },
  });
}
