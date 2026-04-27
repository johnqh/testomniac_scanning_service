import type { BrowserAdapter } from "../adapter";
import type { UiPatternType, UiPattern } from "@sudobility/testomniac_types";

export const PATTERN_TYPE_SELECTORS: Record<UiPatternType, string[]> = {
  card: ["article", ".card", '[class*="card"]', ".product-item", ".post-item"],
  table: ["table:has(thead)", '[role="grid"]', ".data-table", "table:has(th)"],
  form: ['form:not([role="search"])'],
  modal: ['[role="dialog"]', ".modal", "dialog", '[aria-modal="true"]'],
  toast: ['[role="status"]', ".toast", ".notification", ".snackbar"],
  alert: [".alert", '[role="alert"]', ".notice"],
  tabs: ['[role="tablist"]', ".nav-tabs", ".tabs"],
  accordion: ["details", ".accordion", "[role='region'][aria-labelledby]"],
  carousel: [
    ".carousel",
    ".swiper",
    ".slick-slider",
    '[aria-roledescription="carousel"]',
  ],
  dropdown: ['[role="menu"]', ".dropdown-menu", '[aria-haspopup="true"]'],
  pagination: [
    'nav[aria-label*="pagination" i]',
    ".pagination",
    '[aria-label*="page" i]',
  ],
  skeleton: [
    ".skeleton",
    '[class*="skeleton"]',
    '[class*="shimmer"]',
    '[aria-busy="true"]',
  ],
  emptyState: [
    ".empty-state",
    '[class*="empty-state"]',
    '[class*="no-results"]',
    '[class*="no-data"]',
  ],
  errorMessage: [
    ".error-message",
    ".form-error",
    ".invalid-feedback",
    '[class*="error-msg"]',
  ],
  progressBar: ['[role="progressbar"]', ".progress", "progress"],
  tooltip: ['[role="tooltip"]', ".tooltip", "[data-tooltip]"],
  badge: [".badge", '[class*="badge"]', ".tag-count"],
  avatar: [".avatar", '[class*="avatar"]'],
  tag: [".tag", ".chip", '[class*="tag-item"]'],
  stepper: [
    ".stepper",
    ".wizard",
    '[class*="step-indicator"]',
    '[role="group"][aria-label*="step" i]',
  ],
};

export interface DetectedPattern extends UiPattern {
  // UiPattern already has type, selector, count
}

export async function detectPatterns(
  adapter: BrowserAdapter
): Promise<DetectedPattern[]> {
  const results: DetectedPattern[] = [];

  const patternData = await adapter.evaluate(
    (...args: unknown[]) => {
      const selectorMap = args[0] as Record<string, string[]>;
      const found: Array<{ type: string; selector: string; count: number }> =
        [];

      for (const [type, selectors] of Object.entries(selectorMap)) {
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              found.push({ type, selector, count: elements.length });
              break; // first matching selector per type
            }
          } catch {
            // invalid selector, skip
          }
        }
      }

      return found;
    },
    PATTERN_TYPE_SELECTORS as unknown as Record<string, string[]>
  );

  for (const item of patternData as Array<{
    type: string;
    selector: string;
    count: number;
  }>) {
    results.push({
      type: item.type as UiPatternType,
      selector: item.selector,
      count: item.count,
    });
  }

  return results;
}
