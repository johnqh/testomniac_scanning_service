import type { BrowserAdapter } from "../adapter";
import type { ApiClient } from "../api/client";
import type { DecompositionJobResponse } from "@sudobility/testomniac_types";
import type { ScanConfig, ScanEventHandler } from "./types";
import { generateTestCases } from "../generation/generator";

export async function processDecompositionJob(
  job: DecompositionJobResponse,
  _adapter: BrowserAdapter,
  config: ScanConfig,
  api: ApiClient,
  events: ScanEventHandler
): Promise<void> {
  // Generate test cases for this page state
  const generated = await generateTestCases({
    appId: config.appId,
    runId: config.scanId,
    sizeClass: config.sizeClass,
    api,
  });

  if (generated.length === 0) return;

  // Create a test suite for this decomposition job
  const suite = await api.insertTestSuite(config.appId, {
    title: `Page State #${job.pageStateId}`,
    description: `Auto-generated test suite for page state ${job.pageStateId}`,
    startingPageStateId: job.pageStateId,
    startingPath: "/",
    sizeClass: config.sizeClass,
    priority: 3,
    suite_tags: ["auto-generated"],
    decompositionJobId: job.id,
  });
  events.onTestSuiteCreated({ suiteId: suite.id, title: suite.title });

  // Insert test cases and link to suite
  for (const { testCase } of generated) {
    const tc = await api.insertTestCase(config.appId, testCase);
    await api.linkSuiteToCase(suite.id, tc.id);
  }
}
