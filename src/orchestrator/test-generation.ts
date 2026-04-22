import type { ApiClient } from "../api/client";
import type { ScanConfig } from "./types";
import { generateTestCases } from "../generation/generator";
import type { SizeClass } from "../domain/types";

export async function runTestGenerationPhase(
  config: ScanConfig,
  api: ApiClient
): Promise<void> {
  const sizeClass = (config.sizeClass || "desktop") as SizeClass;

  const testCases = await generateTestCases({
    appId: config.appId,
    runId: config.runId,
    sizeClass,
    api,
  });

  for (const tc of testCases) {
    await api.insertTestCase(config.runId, tc);
  }
}
