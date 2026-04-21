import { createHash } from "node:crypto";
import type { ActionableItem, PageHashes } from "../domain/types";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, " ")
    .replace(/\s*=\s*/g, "=")
    .replace(/<(\w+)\s+([^>]*)>/g, (_, tag, attrs) => {
      const sorted = attrs.trim().split(/\s+/).sort().join(" ");
      return `<${tag} ${sorted}>`;
    })
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .trim();
}

function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeHashes(
  html: string,
  actionableItems: ActionableItem[]
): PageHashes {
  const normalized = normalizeHtml(html);
  const visibleText = extractVisibleText(html);
  // Only include VISIBLE items in the actionable hash — this captures
  // state changes like dropdowns opening, modals appearing, tabs switching
  const visibleKeys = actionableItems
    .filter(i => i.visible)
    .map(i => i.stableKey)
    .sort()
    .join("|");

  return {
    htmlHash: sha256(html),
    normalizedHtmlHash: sha256(normalized),
    textHash: sha256(visibleText),
    actionableHash: sha256(visibleKeys),
  };
}
