import type {
  DetectionRule,
  DetectionContext,
  DetectedIssue,
} from "../detection-rule";

export const networkErrorRule: DetectionRule = {
  name: "network_error",
  severity: "bug",

  async detect(_context: DetectionContext): Promise<DetectedIssue[]> {
    // Needs network log capture — not yet implemented
    return [];
  },
};
