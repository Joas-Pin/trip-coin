import { ExtractorSP } from "./extractor-sp.ts";
import { ExtractorRS } from "./extractor-rs.ts";
import { ExtractorPR } from "./extractor-pr.ts";
import { ExtractorGeneric } from "./extractor-generic.ts";
import type { TotalExtractor } from "../types.ts";

export const EXTRACTORS: TotalExtractor[] = [
  new ExtractorSP(),
  new ExtractorRS(),
  new ExtractorPR(),
  new ExtractorGeneric(),
];
