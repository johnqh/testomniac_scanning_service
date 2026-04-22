import type { BrowserAdapter } from "../adapter";
import type { ApiClient } from "../api/client";
import type { ScanConfig, ScanEventHandler } from "./types";
import { extractActionableItems } from "../extractors";
import { computeHashes, extractVisibleText } from "../browser/page-utils";
import { LoopGuard } from "../scanner/loop-guard";
import { StateManager } from "../scanner/state-manager";
import { Navigator } from "../scanner/navigator";
import {
  getActionPriority,
  looksLikeEnterCommitField,
  normalizeHref,
} from "../scanner/action-classifier";
import { fillValuePlanner } from "../planners/fill-value-planner";
import {
  detectBrokenLinks,
  detectVisualIssues,
  detectContentIssues,
  detectMediaIssues,
} from "../detectors/bug-detector";
import { detectAndHandleModal, dismissModal } from "../detectors/modal-handler";
import { HOVER_DELAY_MS, POST_ACTION_SETTLE_MS } from "../config/constants";
import type { ActionableItem } from "@sudobility/testomniac_types";

export async function runMouseScanning(
  adapter: BrowserAdapter,
  config: ScanConfig,
  api: ApiClient,
  events: ScanEventHandler
): Promise<void> {
  const sizeClass = config.sizeClass || "desktop";
  const loopGuard = new LoopGuard();
  const stateManager = new StateManager();
  const navigator = new Navigator({
    stateManager,
    api,
    runId: config.runId,
    sizeClass,
    baseUrl: config.baseUrl,
  });

  // Navigate to base URL
  await adapter.goto(config.baseUrl, {
    waitUntil: "networkidle0",
    timeout: 30_000,
  });
  const startOrigin = new URL(config.baseUrl).origin;

  // Create initial page and page state
  const initialPage = await api.findOrCreatePage(config.appId, config.baseUrl);
  navigator.markPageAsNavigable(initialPage.id);
  events.onPageFound({ url: config.baseUrl, pageId: initialPage.id });

  // Create initial navigate action
  await api.createAction({
    runId: config.runId,
    type: "navigate",
    targetPageId: initialPage.id,
    sizeClass,
  });

  // Main action-driven loop
  let action = await api.getNextOpenAction(config.runId, sizeClass);
  while (action) {
    if (
      !loopGuard.shouldCreate(
        "action",
        action.id,
        stateManager.getCurrentPageStateId() ?? 0
      )
    ) {
      await api.completeAction(action.id, {});
      action = await api.getNextOpenAction(config.runId, sizeClass);
      continue;
    }
    loopGuard.record(
      "action",
      action.id,
      stateManager.getCurrentPageStateId() ?? 0
    );

    await api.startAction(action.id);

    try {
      if (action.type === "navigate") {
        const targetUrl = await navigator.resolveTargetPageUrl(
          action.targetPageId ?? null
        );
        await adapter.goto(targetUrl, {
          waitUntil: "networkidle0",
          timeout: 30_000,
        });

        const currentUrl = await adapter.getUrl();
        const pageRecord = await api.findOrCreatePage(config.appId, currentUrl);
        events.onPageFound({ url: currentUrl, pageId: pageRecord.id });

        // Capture page state
        const html = await adapter.content();
        const items = await extractActionableItems(adapter);
        const visibleText = extractVisibleText(html);
        const hashes = await computeHashes(html, items);

        const existing = await api.findMatchingPageState(
          pageRecord.id,
          hashes,
          sizeClass
        );
        if (existing) {
          stateManager.update(existing.id, currentUrl);
          await api.completeAction(action.id, {});
          action = await api.getNextOpenAction(config.runId, sizeClass);
          continue;
        }

        await adapter.screenshot({ type: "jpeg", quality: 72 });
        const pageState = await api.createPageState({
          pageId: pageRecord.id,
          sizeClass,
          hashes,
          contentText: visibleText.slice(0, 5000),
        });
        stateManager.update(pageState.id, currentUrl);
        events.onPageStateCreated({
          pageStateId: pageState.id,
          pageId: pageRecord.id,
        });

        // Insert actionable items
        if (items.length > 0) {
          await api.insertActionableItems(pageState.id, items);
        }

        // Create actions for visible items sorted by priority
        const sortedItems = [...items]
          .filter(i => i.visible && !i.disabled)
          .sort((a, b) => getActionPriority(a) - getActionPriority(b));

        for (const item of sortedItems) {
          const actionType =
            item.actionKind === "fill"
              ? "fill"
              : item.actionKind === "select"
                ? "select"
                : item.actionKind === "toggle"
                  ? "toggle"
                  : "click";

          await api.createAction({
            runId: config.runId,
            type: actionType,
            startingPageStateId: pageState.id,
            sizeClass,
          });
        }

        // Run bug detection
        await runBugDetection(
          adapter,
          currentUrl,
          html,
          visibleText,
          events,
          api,
          config.runId,
          action.id
        );

        // Discover new pages from links
        for (const item of items.filter(i => i.href && i.visible)) {
          const normalized = normalizeHref(item.href!, config.baseUrl);
          if (!normalized) continue;
          try {
            if (new URL(normalized).origin !== startOrigin) continue;
          } catch {
            continue;
          }
          const newPage = await api.findOrCreatePage(config.appId, normalized);
          await navigator.ensureNavigationActionExists(newPage.id, normalized);
          events.onPageFound({ url: normalized, pageId: newPage.id });
        }
      } else {
        // Non-navigate action: click, fill, select, toggle
        if (action.startingPageStateId) {
          await navigator.ensureOnPage(adapter, action.startingPageStateId);
        }

        const currentUrl = await adapter.getUrl();

        // Resolve the actionable item if we have an ID
        let item: ActionableItem | null = null;
        let itemSelector: string | null = null;
        if (action.actionableItemId) {
          // Get items for the page state to find this item's selector
          const pageStateId =
            action.startingPageStateId ?? stateManager.getCurrentPageStateId();
          if (pageStateId) {
            const stateItems = await api.getItemsByPageState(pageStateId);
            const found = stateItems.find(
              i => i.id === action!.actionableItemId
            );
            if (found) {
              item = found as unknown as ActionableItem;
              itemSelector = found.selector;
            }
          }
        }

        if (itemSelector) {
          const found = await adapter.waitForSelector(itemSelector, {
            visible: true,
            timeout: 3000,
          });

          if (found) {
            // Hover first
            try {
              await adapter.hover(itemSelector, { timeout: 3000 });
              await new Promise(r => setTimeout(r, HOVER_DELAY_MS));
            } catch {
              // hover failed, continue
            }

            // Dismiss any modal triggered by hover
            const modalResult = await detectAndHandleModal(adapter);
            if (modalResult.found) {
              await dismissModal(adapter);
            }

            // Execute the action
            try {
              if (action.type === "fill" && item) {
                const value = fillValuePlanner.planValue(item);
                await adapter.type(itemSelector, value);
                if (looksLikeEnterCommitField(item)) {
                  await adapter.submitTextEntry(itemSelector);
                }
              } else if (action.type === "select") {
                await adapter.select(itemSelector, "");
              } else if (action.type === "toggle") {
                await adapter.click(itemSelector, { timeout: 3000 });
              } else {
                await adapter.click(itemSelector, { timeout: 3000 });
              }
            } catch {
              // Action execution failed
            }

            // Post-action settle
            await new Promise(r => setTimeout(r, POST_ACTION_SETTLE_MS));

            // Dismiss any modal triggered by action
            const postModal = await detectAndHandleModal(adapter);
            if (postModal.found) {
              await dismissModal(adapter);
            }

            // Check for navigation
            const afterUrl = await adapter.getUrl();
            if (afterUrl !== currentUrl) {
              try {
                const afterOrigin = new URL(afterUrl).origin;
                if (afterOrigin !== startOrigin) {
                  await adapter.goto(currentUrl, {
                    waitUntil: "networkidle0",
                    timeout: 30_000,
                  });
                } else {
                  const newPage = await api.findOrCreatePage(
                    config.appId,
                    afterUrl
                  );
                  await navigator.ensureNavigationActionExists(
                    newPage.id,
                    afterUrl
                  );
                  events.onPageFound({ url: afterUrl, pageId: newPage.id });
                  await adapter.goto(currentUrl, {
                    waitUntil: "networkidle0",
                    timeout: 30_000,
                  });
                }
              } catch {
                await adapter.goto(currentUrl, {
                  waitUntil: "networkidle0",
                  timeout: 30_000,
                });
              }
            }

            // Screenshot after action
            try {
              const screenshot = await adapter.screenshot({
                type: "jpeg",
                quality: 72,
              });
              const base64 = uint8ToBase64(screenshot);
              events.onScreenshotCaptured({
                dataUrl: `data:image/jpeg;base64,${base64}`,
                pageUrl: currentUrl,
              });
            } catch {
              // Screenshot failed
            }
          }
        }

        events.onActionCompleted({
          type: action.type,
          selector: itemSelector || undefined,
          pageUrl: currentUrl,
        });
      }
    } catch (error) {
      events.onError({
        message: error instanceof Error ? error.message : "Action failed",
        phase: "mouse_scanning",
      });
    }

    if (action) {
      await api.completeAction(action.id, {});
    }
    action = await api.getNextOpenAction(config.runId, sizeClass);
  }
}

async function runBugDetection(
  adapter: BrowserAdapter,
  pageUrl: string,
  html: string,
  visibleText: string,
  events: ScanEventHandler,
  api: ApiClient,
  runId: number,
  actionId: number
): Promise<void> {
  const visualIssues = detectVisualIssues(html);
  for (const issue of visualIssues) {
    events.onIssueDetected(issue);
    await api.createIssue({
      runId,
      actionId,
      type: issue.type,
      description: issue.description,
      reproductionSteps: [],
    });
  }

  const contentIssues = detectContentIssues(visibleText);
  for (const issue of contentIssues) {
    events.onIssueDetected(issue);
    await api.createIssue({
      runId,
      actionId,
      type: issue.type,
      description: issue.description,
      reproductionSteps: [],
    });
  }

  try {
    const brokenLinks = await detectBrokenLinks(adapter, pageUrl);
    for (const link of brokenLinks) {
      const issue = {
        type: "broken_link",
        description: `Broken link: ${link.href} (${link.error}) — "${link.text}"`,
      };
      events.onIssueDetected(issue);
      await api.createIssue({
        runId,
        actionId,
        ...issue,
        reproductionSteps: [],
      });
    }
  } catch {
    // Link checking failed
  }

  try {
    const mediaIssues = await detectMediaIssues(adapter);
    for (const issue of mediaIssues) {
      events.onIssueDetected(issue);
      await api.createIssue({
        runId,
        actionId,
        ...issue,
        reproductionSteps: [],
      });
    }
  } catch {
    // Media detection failed
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
