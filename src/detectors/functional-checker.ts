export interface FunctionalIssue {
  type: string;
  description: string;
  severity: "error" | "warning" | "info";
}

/**
 * Analyze console errors for real issues (filtering noise).
 */
export function analyzeConsoleErrors(errors: string[]): FunctionalIssue[] {
  const issues: FunctionalIssue[] = [];
  const noise = [
    /favicon/i,
    /third.party/i,
    /polyfill/i,
    /analytics/i,
    /tracking/i,
    /deprecated/i,
    /JQMIGRATE/i,
  ];

  for (const error of errors) {
    const isNoise = noise.some(p => p.test(error));
    if (!isNoise) {
      issues.push({
        type: "console_error",
        description: error.slice(0, 200),
        severity: "error",
      });
    }
  }
  return issues;
}

/**
 * Analyze network responses for errors.
 */
export function analyzeNetworkErrors(
  responses: Array<{
    url: string;
    status: number;
    contentType?: string;
  }>,
  baseOrigin: string
): FunctionalIssue[] {
  const issues: FunctionalIssue[] = [];
  for (const resp of responses) {
    if (resp.status < 400) continue;
    try {
      const url = new URL(resp.url);
      const isSameOrigin = url.origin === baseOrigin;
      // Same origin errors are always important
      if (isSameOrigin) {
        issues.push({
          type: resp.status >= 500 ? "server_error" : "not_found",
          description: `${resp.status} for ${resp.url}`,
          severity: resp.status >= 500 ? "error" : "warning",
        });
      }
      // External 5xx are also important
      else if (resp.status >= 500) {
        issues.push({
          type: "external_server_error",
          description: `External resource returned ${resp.status}: ${resp.url}`,
          severity: "warning",
        });
      }
    } catch {
      /* ignore invalid URLs */
    }
  }
  return issues;
}

/**
 * Check if a click resulted in an error page or unexpected state.
 */
export function checkPostClickState(
  beforeUrl: string,
  afterUrl: string,
  afterText: string
): FunctionalIssue[] {
  const issues: FunctionalIssue[] = [];

  // Click led to error page
  const errorIndicators = [
    /404/i,
    /not found/i,
    /error/i,
    /500/i,
    /something went wrong/i,
    /oops/i,
    /forbidden/i,
  ];
  for (const pattern of errorIndicators) {
    if (pattern.test(afterText) && !pattern.test(beforeUrl)) {
      issues.push({
        type: "click_leads_to_error",
        description: `Click navigated to error page: ${afterUrl}`,
        severity: "error",
      });
      break;
    }
  }

  return issues;
}
