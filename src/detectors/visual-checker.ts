export interface VisualIssue {
  type: string;
  description: string;
  selector?: string;
  severity: "error" | "warning" | "info";
}

/**
 * Check HTML for common visual issues.
 */
export function checkVisualIssues(
  html: string,
  _pageUrl: string
): VisualIssue[] {
  const issues: VisualIssue[] = [];

  // Broken images (src that's empty or placeholder)
  const imgRegex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src || src === "#" || src === "undefined" || src === "null") {
      issues.push({
        type: "broken_image",
        description: `Image has empty/invalid src: "${src}"`,
        severity: "error",
      });
    }
  }

  // Missing alt text on images
  const imgNoAltRegex = /<img(?![^>]*alt=)[^>]*>/gi;
  const imgsWithoutAlt = html.match(imgNoAltRegex) || [];
  if (imgsWithoutAlt.length > 0) {
    issues.push({
      type: "missing_alt_text",
      description: `${imgsWithoutAlt.length} image(s) missing alt attribute`,
      severity: "warning",
    });
  }

  // Duplicate IDs
  const idRegex = /\bid=["']([^"']+)["']/gi;
  const ids: Record<string, number> = {};
  while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    ids[id] = (ids[id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(ids)) {
    if (count > 1) {
      issues.push({
        type: "duplicate_id",
        description: `Duplicate id="${id}" found ${count} times`,
        severity: "warning",
      });
    }
  }

  // Overlapping/duplicate text blocks (same text appearing multiple times)
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const headings: string[] = [];
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 5) headings.push(text);
  }
  const headingCounts: Record<string, number> = {};
  for (const h of headings) {
    headingCounts[h] = (headingCounts[h] || 0) + 1;
  }
  for (const [text, count] of Object.entries(headingCounts)) {
    if (count > 1) {
      issues.push({
        type: "duplicate_heading",
        description: `Heading "${text.slice(0, 50)}" appears ${count} times`,
        severity: "warning",
      });
    }
  }

  // Empty links
  const emptyLinkRegex = /<a[^>]*href=["'][^"']*["'][^>]*>\s*<\/a>/gi;
  const emptyLinks = html.match(emptyLinkRegex) || [];
  if (emptyLinks.length > 0) {
    issues.push({
      type: "empty_link",
      description: `${emptyLinks.length} link(s) with no visible text`,
      severity: "warning",
    });
  }

  return issues;
}
