export function normalizeBaseUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  // Remove tracking params
  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ];
  for (const param of trackingParams) {
    parsed.searchParams.delete(param);
  }
  // Normalize: lowercase host, remove trailing slash
  let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  const search = parsed.searchParams.toString();
  if (search) {
    normalized += `?${search}`;
  }
  return normalized.toLowerCase();
}

export function getRegistrableDomain(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.hostname.split(".");
  if (parts.length <= 2) return parsed.hostname;
  return parts.slice(-2).join(".");
}

export function emailMatchesUrlDomain(email: string, url: string): boolean {
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) return false;
  const urlDomain = getRegistrableDomain(url).toLowerCase();
  return emailDomain === urlDomain || emailDomain.endsWith("." + urlDomain);
}

export function classifyProjectOwnership(
  existingProject: { entityId: string | null } | null | undefined
): "new_project" | "duplicate_owned" | "duplicate_unclaimed" {
  if (!existingProject) return "new_project";
  if (existingProject.entityId) return "duplicate_owned";
  return "duplicate_unclaimed";
}
