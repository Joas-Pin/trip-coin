import * as cheerio from "cheerio";
import type { Parser, NFCeData } from "../types.ts";
import { parseCurrency, extractChaveAcesso } from "../utils.ts";

export class ParserGeneric implements Parser {
  private uf: string;

  constructor(uf: string) {
    this.uf = uf;
  }

  async parse(html: string): Promise<NFCeData> {
    const $ = cheerio.load(html);
    
    const chaveAcesso = extractChaveAcesso($.html()) || "";
    
    // Generic extraction - try to find common patterns
    let valorTotal = 0;
    const searchTexts = ["valor total", "total da nota", "total"];
    const tags = ["td", "span", "div", "p", "strong"];
    
    for (const text of searchTexts) {
      for (const tag of tags) {
        const elements = $(tag);
        for (let i = 0; i < elements.length; i++) {
          const el = elements.eq(i);
          const elText = el.text().toLowerCase();
          if (elText.includes(text)) {
            const val = parseCurrency(el.text());
            if (val > 0) {
              valorTotal = val;
              break;
            }
          }
        }
        if (valorTotal > 0) break;
      }
      if (valorTotal > 0) break;
    }
    
    return {
      chaveAcesso,
      uf: this.uf,
      emitente: "",
      cnpj: "",
      numero: "",
      serie: "",
      dataEmissao: "",
      valorTotal,
      urlConsulta: "",
      produtos: [],
    };
  }
}
