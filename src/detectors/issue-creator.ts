import type { ApiClient } from "../api/client";
import type { DetectionContext, DetectedIssue } from "./detection-rule";
import { getAllDetectionRules } from "./rules";

/**
 * Run all detection rules against the current page context, then
 * deduplicate and persist any new issues via the API.
 *
 * For each detected issue:
 * 1. Look up (or create) a test case whose action chain matches
 * 2. Check whether the same rule already produced an open issue for that test case
 * 3. Create the issue only if no duplicate exists
 */
export async function runDetectionRules(
  context: DetectionContext,
  api: ApiClient
): Promise<DetectedIssue[]> {
  const rules = getAllDetectionRules();
  const allIssues: DetectedIssue[] = [];

  for (const rule of rules) {
    try {
      const issues = await rule.detect(context);
      allIssues.push(...issues);
    } catch {
      // Individual rule failure should not stop the rest
    }
  }

  // Persist each detected issue with dedup
  for (const issue of allIssues) {
    try {
      await persistIssue(context, api, issue);
    } catch {
      // Persistence failure should not stop the rest
    }
  }

  return allIssues;
}

async function persistIssue(
  context: DetectionContext,
  api: ApiClient,
  issue: DetectedIssue
): Promise<void> {
  const { appId, scanId } = context;
  const actionIds = issue.actionChain;

  // 1. Find or create a test case with the same action chain
  let testCaseId: number | undefined;
  if (actionIds.length > 0) {
    const existing = await api.findTestCaseByActions(appId, actionIds);
    if (existing) {
      testCaseId = existing.id;
    } else {
      // Create a new test case for this action chain
      const tc = await api.insertTestCase(appId, {
        name: issue.title,
        type: "interaction",
        sizeClass: "desktop",
        suite_tags: ["detection"],
        priority: issue.severity === "bug" ? "high" : "medium",
      });
      testCaseId = tc.id;

      // Link actions to the test case
      for (let i = 0; i < actionIds.length; i++) {
        await api.createTestCaseAction({
          testCaseId: tc.id,
          actionId: actionIds[i],
          stepOrder: i + 1,
        });
      }
    }
  }

  // 2. Check for existing open issue with the same rule on the same test case
  if (testCaseId) {
    const existingIssue = await api.findIssueByRule(testCaseId, issue.ruleName);
    if (existingIssue) {
      // Duplicate — skip
      return;
    }
  }

  // 3. Create the issue
  await api.createIssue({
    appId,
    scanId,
    testCaseId,
    severity: issue.severity,
    ruleName: issue.ruleName,
    title: issue.title,
    description: issue.observedOutcome,
    expectedOutcome: issue.expectedOutcome,
    observedOutcome: issue.observedOutcome,
  });
}
