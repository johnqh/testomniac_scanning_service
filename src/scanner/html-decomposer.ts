import type { DetectedReusableRegion } from "./component-detector";
import type { PatternInstance } from "@sudobility/testomniac_types";

// =============================================================================
// getBody — extract <body> content from full HTML
// =============================================================================

export function getBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : html;
}

// =============================================================================
// getContentBody — strip reusable elements from body
// =============================================================================

export function getContentBody(
  body: string,
  regions: DetectedReusableRegion[]
): { contentBody: string; reusableElements: DetectedReusableRegion[] } {
  let contentBody = body;
  const reusableElements: DetectedReusableRegion[] = [];
  for (const region of regions) {
    if (contentBody.includes(region.outerHtml)) {
      contentBody = contentBody.replace(
        region.outerHtml,
        `<!-- reusable: ${region.type} -->`
      );
      reusableElements.push(region);
    }
  }
  return { contentBody, reusableElements };
}

// =============================================================================
// getFixedBody — strip pattern instances from content body
// =============================================================================

export function getFixedBody(
  contentBody: string,
  patternInstances: PatternInstance[]
): { fixedBody: string; patterns: PatternInstance[] } {
  let fixedBody = contentBody;
  const patterns: PatternInstance[] = [];
  for (const instance of patternInstances) {
    if (fixedBody.includes(instance.outerHtml)) {
      fixedBody = fixedBody.replace(
        instance.outerHtml,
        `<!-- pattern: ${instance.type} -->`
      );
      patterns.push(instance);
    }
  }
  return { fixedBody, patterns };
}

// =============================================================================
// Backward-compat wrapper
// =============================================================================

export interface DecomposedHtml {
  bodyHtml: string;
  contentHtml: string;
  regions: DetectedReusableRegion[];
}

/** @deprecated Use getContentBody instead */
export function decomposeHtml(
  bodyHtml: string,
  regions: DetectedReusableRegion[]
): DecomposedHtml {
  const { contentBody, reusableElements } = getContentBody(bodyHtml, regions);
  return { bodyHtml, contentHtml: contentBody, regions: reusableElements };
}
