import { generateRenderTest } from "./render";
import { assignPriority } from "./suite-tagger";
import type { TestCase, SizeClass } from "../domain/types";
import type { ApiClient } from "../api/client";

export interface GeneratorOptions {
  appId: number;
  runId: number;
  sizeClass: SizeClass;
  api: ApiClient;
}

export async function generateTestCases(
  options: GeneratorOptions
): Promise<TestCase[]> {
  const { appId, sizeClass, api } = options;
  const testCases: TestCase[] = [];
  const allPages = await api.getPagesByApp(appId);

  for (const page of allPages) {
    const priority = assignPriority(page.routeKey || "", page.url);
    testCases.push(
      generateRenderTest({
        pageId: page.id,
        pageName: page.routeKey || page.url,
        url: page.url,
        sizeClass,
        priority,
        elements: [],
      })
    );
  }

  return testCases;
}
