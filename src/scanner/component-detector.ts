import { createHash } from "node:crypto";
import { normalizeHtml } from "../browser/page-utils";

export const COMPONENT_SELECTORS = [
  "nav",
  "header",
  "footer",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
];

export interface CandidateRegion {
  pageStateId: number;
  selector: string;
  innerHtml: string;
  hash: string;
}

export interface ComponentGroup {
  selector: string;
  hash: string;
  instances: Array<{ pageStateId: number }>;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function extractCandidateRegions(
  html: string
): Array<{ selector: string; innerHtml: string }> {
  const results: Array<{ selector: string; innerHtml: string }> = [];
  for (const selector of COMPONENT_SELECTORS) {
    const tagName = selector.replace(/\[.*\]/, "").trim();
    if (tagName && !tagName.startsWith("[")) {
      const pattern = new RegExp(
        `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "gi"
      );
      let match;
      while ((match = pattern.exec(html)) !== null) {
        results.push({ selector: tagName, innerHtml: match[1].trim() });
      }
    }
    if (selector.startsWith("[role=")) {
      const role = selector.match(/role="([^"]+)"/)?.[1];
      if (role) {
        const rolePattern = new RegExp(
          `<\\w+[^>]*role=["']${role}["'][^>]*>([\\s\\S]*?)<\\/\\w+>`,
          "gi"
        );
        let match;
        while ((match = rolePattern.exec(html)) !== null) {
          results.push({ selector, innerHtml: match[1].trim() });
        }
      }
    }
  }
  return results;
}

export function hashRegion(innerHtml: string): string {
  return sha256(normalizeHtml(innerHtml));
}

export function groupByHash(regions: CandidateRegion[]): ComponentGroup[] {
  const groups = new Map<string, ComponentGroup>();
  for (const region of regions) {
    const key = `${region.selector}:${region.hash}`;
    if (!groups.has(key)) {
      groups.set(key, {
        selector: region.selector,
        hash: region.hash,
        instances: [],
      });
    }
    groups.get(key)!.instances.push({ pageStateId: region.pageStateId });
  }
  return [...groups.values()];
}

export interface DetectedComponent {
  name: string;
  selector: string;
  hash: string;
  canonicalPageStateId: number;
  instances: Array<{
    pageStateId: number;
    isIdentical: boolean;
    hash: string;
  }>;
}

export function detectComponents(
  allRegions: CandidateRegion[]
): DetectedComponent[] {
  const bySelector = new Map<string, CandidateRegion[]>();
  for (const r of allRegions) {
    if (!bySelector.has(r.selector)) bySelector.set(r.selector, []);
    bySelector.get(r.selector)!.push(r);
  }

  const components: DetectedComponent[] = [];

  for (const [selector, regions] of bySelector) {
    if (regions.length < 2) continue;
    const groups = groupByHash(regions);
    let canonicalGroup = groups[0];
    for (const g of groups) {
      if (g.instances.length > canonicalGroup.instances.length)
        canonicalGroup = g;
    }

    const name = selector.replace(/[[\]"'=]/g, "").replace(/^\./, "");
    const allInstances: DetectedComponent["instances"] = [];
    for (const group of groups) {
      for (const inst of group.instances) {
        allInstances.push({
          pageStateId: inst.pageStateId,
          isIdentical: group.hash === canonicalGroup.hash,
          hash: group.hash,
        });
      }
    }

    components.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      selector,
      hash: canonicalGroup.hash,
      canonicalPageStateId: canonicalGroup.instances[0].pageStateId,
      instances: allInstances,
    });
  }

  return components;
}
