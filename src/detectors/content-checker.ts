export interface ContentIssue {
  type: string;
  description: string;
  severity: "error" | "warning" | "info";
}

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /dolor sit amet/i,
  /consectetur adipiscing/i,
  /TODO/g,
  /FIXME/g,
  /xxx+/gi,
  /placeholder/i,
  /sample text/i,
  /test test/i,
  /foo bar/i,
  /example\.com/gi,
];

const PRICE_PATTERN = /\$[\d,]+\.\d{2}/g;

/**
 * Check visible text for content issues.
 */
export function checkContentIssues(
  visibleText: string,
  _html: string
): ContentIssue[] {
  const issues: ContentIssue[] = [];

  // Placeholder text
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(visibleText)) {
      issues.push({
        type: "placeholder_text",
        description: `Page contains placeholder text matching: ${pattern.source}`,
        severity: "error",
      });
    }
    if ("lastIndex" in pattern) pattern.lastIndex = 0;
  }

  // Negative or zero prices
  const prices = visibleText.match(PRICE_PATTERN) || [];
  for (const price of prices) {
    const value = parseFloat(price.replace("$", "").replace(",", ""));
    if (value <= 0) {
      issues.push({
        type: "invalid_price",
        description: `Invalid price found: ${price}`,
        severity: "error",
      });
    }
  }

  // Very short page content (might be error/blank page)
  if (visibleText.trim().length < 50) {
    issues.push({
      type: "empty_page",
      description: "Page has very little visible content",
      severity: "error",
    });
  }

  // Check for error page indicators
  const errorPatterns = [
    /404\s*(not found|error|page)/i,
    /500\s*(internal|server|error)/i,
    /403\s*(forbidden|error)/i,
    /page not found/i,
    /something went wrong/i,
    /an error occurred/i,
    /error loading/i,
    /cannot be found/i,
    /no longer available/i,
    /oops/i,
  ];
  for (const pattern of errorPatterns) {
    if (pattern.test(visibleText)) {
      issues.push({
        type: "error_page",
        description: `Page appears to be an error page: "${visibleText.match(pattern)?.[0]}"`,
        severity: "error",
      });
    }
  }

  return issues;
}
