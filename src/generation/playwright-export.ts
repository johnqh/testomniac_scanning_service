import type { TestAction } from "../domain/types";

export interface PlaywrightTestInput {
  testName: string;
  baseUrl: string;
  steps: TestAction[];
}

export function exportAsPlaywrightScript(input: PlaywrightTestInput): string {
  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    "",
    `test('${escapeSingleQuotes(input.testName)}', async ({ page }) => {`,
  ];

  for (const step of input.steps) {
    lines.push(`  ${step.playwrightCode}`);
  }

  lines.push("});");
  lines.push("");
  return lines.join("\n");
}

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, "\\'");
}
