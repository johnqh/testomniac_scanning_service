import type { DetectionRule } from "../detection-rule";
import { duplicateHeadingRule } from "./duplicate-heading-rule";
import { emptyLinkRule } from "./empty-link-rule";
import { brokenImageRule } from "./broken-image-rule";
import { duplicateIdRule } from "./duplicate-id-rule";
import { placeholderTextRule } from "./placeholder-text-rule";
import { errorPageRule } from "./error-page-rule";
import { blankPageRule } from "./blank-page-rule";
import { brokenLinkRule } from "./broken-link-rule";
import { brokenMediaRule } from "./broken-media-rule";
import { deadClickRule } from "./dead-click-rule";
import { consoleErrorRule } from "./console-error-rule";
import { networkErrorRule } from "./network-error-rule";

export function getAllDetectionRules(): DetectionRule[] {
  return [
    // Pure HTML/text rules (no adapter needed)
    duplicateHeadingRule,
    emptyLinkRule,
    brokenImageRule,
    duplicateIdRule,
    placeholderTextRule,
    errorPageRule,
    blankPageRule,
    // Adapter-based rules (need browser context)
    brokenLinkRule,
    brokenMediaRule,
    deadClickRule,
    consoleErrorRule,
    networkErrorRule,
  ];
}

export {
  duplicateHeadingRule,
  emptyLinkRule,
  brokenImageRule,
  duplicateIdRule,
  placeholderTextRule,
  errorPageRule,
  blankPageRule,
  brokenLinkRule,
  brokenMediaRule,
  deadClickRule,
  consoleErrorRule,
  networkErrorRule,
};
