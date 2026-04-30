import type { SizeClass } from "../domain/types";

export interface ScanConfig {
  scanId: number;
  appId: number;
  scanUrl: string;
  baseUrl: string;
  sizeClass: SizeClass;
  openaiApiKey?: string;
  openaiModel?: string;
  testWorkerCount?: number;
  signal?: AbortSignal;
}

export interface ScanEventHandler {
  onPageFound(page: { relativePath: string; pageId: number }): void;
  onPageStateCreated(state: {
    pageStateId: number;
    pageId: number;
    screenshotPath?: string;
  }): void;
  onDecompositionJobCreated(job: { jobId: number; pageStateId: number }): void;
  onDecompositionJobCompleted(job: { jobId: number }): void;
  onTestSuiteCreated(suite: { suiteId: number; title: string }): void;
  onTestRunCompleted(run: { testRunId: number; passed: boolean }): void;
  onFindingCreated(finding: { type: string; title: string }): void;
  onStatsUpdated(stats: {
    pagesFound: number;
    pageStatesFound: number;
    testRunsCompleted: number;
    findingsFound: number;
  }): void;
  onScreenshotCaptured(data: { dataUrl: string; pageUrl: string }): void;
  onScanComplete(summary: {
    totalPages: number;
    totalFindings: number;
    durationMs: number;
  }): void;
  onError(error: { message: string }): void;
}

export interface ScanResult {
  scanId: number;
  pagesFound: number;
  pageStatesFound: number;
  testRunsCompleted: number;
  findingsFound: number;
  durationMs: number;
}
