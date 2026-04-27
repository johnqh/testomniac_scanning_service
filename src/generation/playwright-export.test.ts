import { describe, it, expect } from "vitest";
import { exportAsPlaywrightScript } from "./playwright-export";
import { PlaywrightAction } from "../domain/types";
import type { TestAction } from "../domain/types";

describe("exportAsPlaywrightScript", () => {
  it("generates a valid Playwright test script for a render test", () => {
    const steps: TestAction[] = [
      {
        actionType: PlaywrightAction.Goto,
        url: "https://example.com",
        playwrightCode: "await page.goto('https://example.com');",
        description: "Navigate to https://example.com",
      },
      {
        actionType: PlaywrightAction.AssertVisible,
        elementIdentityId: 5,
        playwrightCode:
          "await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();",
        description: "Assert 'Welcome' heading is visible",
      },
      {
        actionType: PlaywrightAction.Screenshot,
        value: "render-home",
        playwrightCode:
          "await page.screenshot({ path: 'render-home.png', fullPage: true });",
        description: "Take screenshot 'render-home'",
      },
    ];

    const script = exportAsPlaywrightScript({
      testName: "Render — Home Page",
      baseUrl: "https://example.com",
      steps,
    });

    expect(script).toContain("import { test, expect } from '@playwright/test'");
    expect(script).toContain("test('Render — Home Page'");
    expect(script).toContain("await page.goto('https://example.com');");
    expect(script).toContain(
      "await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();"
    );
    expect(script).toContain("await page.screenshot(");
  });

  it("generates fill and click steps", () => {
    const steps: TestAction[] = [
      {
        actionType: PlaywrightAction.Goto,
        url: "https://example.com/login",
        playwrightCode: "await page.goto('https://example.com/login');",
        description: "Navigate to https://example.com/login",
      },
      {
        actionType: PlaywrightAction.Fill,
        elementIdentityId: 15,
        value: "jane@example.com",
        playwrightCode:
          "await page.getByLabel('Email').fill('jane@example.com');",
        description: "Type 'jane@example.com' in 'Email' textbox",
      },
      {
        actionType: PlaywrightAction.Fill,
        elementIdentityId: 16,
        value: "secret123",
        playwrightCode: "await page.getByLabel('Password').fill('secret123');",
        description: "Type 'secret123' in 'Password' textbox",
      },
      {
        actionType: PlaywrightAction.Click,
        elementIdentityId: 42,
        playwrightCode:
          "await page.getByRole('button', { name: 'Sign In' }).click();",
        description: "Click 'Sign In' button",
      },
    ];

    const script = exportAsPlaywrightScript({
      testName: "Login flow",
      baseUrl: "https://example.com/login",
      steps,
    });

    expect(script).toContain(
      "await page.getByLabel('Email').fill('jane@example.com');"
    );
    expect(script).toContain(
      "await page.getByLabel('Password').fill('secret123');"
    );
    expect(script).toContain(
      "await page.getByRole('button', { name: 'Sign In' }).click();"
    );
  });

  it("handles scoped locators in playwrightCode", () => {
    const steps: TestAction[] = [
      {
        actionType: PlaywrightAction.Check,
        elementIdentityId: 31,
        playwrightCode:
          "await page.getByRole('group', { name: 'Shipping' }).getByRole('radio', { name: 'Express' }).check();",
        description: "Check 'Express' radio in 'Shipping' group",
      },
    ];

    const script = exportAsPlaywrightScript({
      testName: "Radio selection",
      baseUrl: "https://example.com",
      steps,
    });

    expect(script).toContain(
      "await page.getByRole('group', { name: 'Shipping' }).getByRole('radio', { name: 'Express' }).check();"
    );
  });
});
