import type { BrowserAdapter } from "../adapter";
import type { ApiClient } from "../api/client";
import type { ScanConfig, ScanEventHandler } from "./types";

export async function executeTestCases(
  config: ScanConfig,
  _adapter: BrowserAdapter,
  api: ApiClient,
  events: ScanEventHandler
): Promise<boolean> {
  const testCases = await api.getTestCasesByApp(config.appId);
  const newJobsCreated = false;

  for (const tc of testCases) {
    if (config.signal?.aborted) break;

    // Check dependency
    if (tc.dependencyTestCaseId) {
      // TODO: check if dependency is met
    }

    // Create test run
    const testRun = await api.createTestRun({
      testCaseId: tc.id,
      scanId: config.scanId,
      sizeClass: config.sizeClass,
    });

    const startTime = Date.now();

    try {
      // TODO: Execute test actions via browser adapter
      // For now, mark as completed
      const durationMs = Date.now() - startTime;
      await api.completeTestRun(testRun.id, {
        status: "completed",
        durationMs,
      });

      events.onTestRunCompleted({ testRunId: testRun.id, passed: true });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await api.completeTestRun(testRun.id, {
        status: "completed",
        durationMs,
        errorMessage,
      });

      // Create finding for the error
      await api.createTestRunFinding({
        testRunId: testRun.id,
        type: "error",
        title: `Test failure: ${tc.title}`,
        description: errorMessage,
      });

      events.onFindingCreated({
        type: "error",
        title: `Test failure: ${tc.title}`,
      });

      events.onTestRunCompleted({ testRunId: testRun.id, passed: false });
    }
  }

  return newJobsCreated;
}
