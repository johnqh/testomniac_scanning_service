import type {
  TestAction,
  LegacyTestAction,
  TestCase,
  SizeClass,
} from "../domain/types";
import { PlaywrightAction } from "../domain/types";
import { assignSuiteTags } from "./suite-tagger";

export interface GeneratedTestCase {
  testCase: TestCase;
  actions: TestAction[];
}

/** @deprecated Use GeneratedTestCase instead */
export interface LegacyGeneratedTestCase {
  testCase: TestCase;
  actions: LegacyTestAction[];
}

export interface RenderElement {
  elementIdentityId: number;
  playwrightLocator: string;
  playwrightScopeChain?: string;
  computedName: string;
  role: string;
  visible: boolean;
}

interface RenderInput {
  pageId: number;
  pageStateId: number;
  pageName: string;
  url: string;
  sizeClass: SizeClass;
  priority: string;
  elements: RenderElement[];
}

export function generateRenderTest(input: RenderInput): GeneratedTestCase {
  const actions: TestAction[] = [
    {
      actionType: PlaywrightAction.Goto,
      pageStateId: input.pageStateId,
      url: input.url,
      playwrightCode: `await page.goto('${input.url}');`,
      description: `Navigate to ${input.url}`,
    },
    {
      actionType: PlaywrightAction.WaitForLoadState,
      pageStateId: input.pageStateId,
      playwrightCode: "await page.waitForLoadState('networkidle');",
      description: "Wait for page to load",
    },
  ];

  for (const el of input.elements.filter(e => e.visible).slice(0, 10)) {
    const locatorExpr = el.playwrightScopeChain
      ? `page.${el.playwrightScopeChain}.${el.playwrightLocator}`
      : `page.${el.playwrightLocator}`;

    actions.push({
      actionType: PlaywrightAction.AssertVisible,
      pageStateId: input.pageStateId,
      elementIdentityId: el.elementIdentityId,
      playwrightCode: `await expect(${locatorExpr}).toBeVisible();`,
      description: `Assert '${el.computedName}' ${el.role} is visible`,
    });
  }

  const label = `render-${input.pageName.toLowerCase().replace(/\s+/g, "-")}`;
  actions.push({
    actionType: PlaywrightAction.Screenshot,
    pageStateId: input.pageStateId,
    value: label,
    playwrightCode: `await page.screenshot({ path: '${label}.png', fullPage: true });`,
    description: `Take screenshot '${label}'`,
  });

  return {
    testCase: {
      name: `Render — ${input.pageName}`,
      type: "render",
      sizeClass: input.sizeClass,
      suite_tags: assignSuiteTags("render", input.priority),
      page_id: input.pageId,
      priority: input.priority,
    },
    actions,
  };
}
