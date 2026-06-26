import * as cheerio from "cheerio";
import type { TotalExtractor } from "../types.ts";
import { parseCurrency, cleanText } from "../utils.ts";
import { TOTAL_KEYWORDS } from "../constants.ts";

export class ExtractorGeneric implements TotalExtractor {
  extract(html: string): number {
    const $ = cheerio.load(html);

    // First, try known IDs and classes
    const knownSelectors = [
      "#valorTotal",
      "#totalNota",
      ".totalNota",
      ".valorTotal",
      ".txtMax",
    ];

    for (const selector of knownSelectors) {
      const text = $(selector).text();
      const valor = parseCurrency(text);
      if (valor > 0) return valor;
    }

    // Then, look for elements near total keywords
    const allElements = $("td, span, div, p, strong");
    for (let i = 0; i < allElements.length; i++) {
      const el = $(allElements[i]);
      const text = cleanText(el.text());

      if (TOTAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
        // Check this element first
        let valor = parseCurrency(el.text());
        if (valor > 0) return valor;

        // Check nearby siblings
        const next = el.next();
        if (next.length > 0) {
          valor = parseCurrency(next.text());
          if (valor > 0) return valor;
        }

        const prev = el.prev();
        if (prev.length > 0) {
          valor = parseCurrency(prev.text());
          if (valor > 0) return valor;
        }

        // Check parent's children
        const parent = el.parent();
        if (parent.length > 0) {
          const parentText = parent.text();
          valor = parseCurrency(parentText);
          if (valor > 0) return valor;
        }
      }
    }

    // Last resort: look for any valid currency value near keywords
    const htmlLower = cleanText(html);
    for (const keyword of TOTAL_KEYWORDS) {
      const index = htmlLower.indexOf(keyword);
      if (index !== -1) {
        const snippet = html.slice(index - 100, index + 200);
        const currencyPattern = /R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/i;
        const match = snippet.match(currencyPattern);
        if (match) {
          const valor = parseCurrency(match[1]);
          if (valor > 0) return valor;
        }
      }
    }

    return 0;
  }
}
