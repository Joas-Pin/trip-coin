import * as cheerio from "cheerio";
import type { TotalExtractor } from "../types.ts";
import { parseCurrency } from "../utils.ts";

export class ExtractorPR implements TotalExtractor {
  extract(html: string): number {
    const $ = cheerio.load(html);
    const selectors = [
      "#valorTotal",
      ".total-pr",
      ".valor-total-pr",
    ];

    for (const selector of selectors) {
      const text = $(selector).text();
      const valor = parseCurrency(text);
      if (valor > 0) return valor;
    }

    return 0;
  }
}
