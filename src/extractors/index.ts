import type { ActionableItem } from "@sudobility/testomniac_types";
import type { BrowserAdapter } from "../adapter";
import { buildDomSnapshot } from "../browser/dom-snapshot";
import { buttonExtractor } from "./buttons";
import { clickableExtractor } from "./clickables";
import { productActionExtractor } from "./product-actions";
import { resolveSelectors } from "./selectors";
import { selectExtractor } from "./selects";
import { textInputExtractor } from "./text-inputs";
import { toggleExtractor } from "./toggles";
import type { ItemExtractor } from "./types";

const extractorRegistry: ItemExtractor[] = [
  textInputExtractor,
  selectExtractor,
  toggleExtractor,
  productActionExtractor,
  buttonExtractor,
  clickableExtractor,
];

export async function extractActionableItems(
  adapter: BrowserAdapter
): Promise<ActionableItem[]> {
  const snapshot = await buildDomSnapshot(adapter);
  const candidates = extractorRegistry.flatMap(extractor =>
    extractor.extract(snapshot)
  );
  return resolveSelectors(candidates);
}

export function getRegisteredExtractorNames(): string[] {
  return extractorRegistry.map(extractor => extractor.name);
}
