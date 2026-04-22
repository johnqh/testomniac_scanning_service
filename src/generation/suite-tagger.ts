import { HIGH_PRIORITY_KEYWORDS } from "../config/constants";

export function assignPriority(route: string, title: string): string {
  const text = (route + " " + title).toLowerCase();
  return HIGH_PRIORITY_KEYWORDS.some(kw => text.includes(kw))
    ? "high"
    : "normal";
}

export function assignSuiteTags(testType: string, priority: string): string[] {
  const tags = ["regression"];
  if (testType === "render" && priority === "high")
    tags.push("sanity", "smoke");
  if (testType === "form" && priority === "high") tags.push("sanity");
  if (testType === "navigation") tags.push("sanity");
  if (testType === "e2e") tags.push("sanity", "smoke");
  return [...new Set(tags)];
}
