import type { Parser } from "../types.ts";
import { ParserSP } from "./parser-sp.ts";
import { ParserRS } from "./parser-rs.ts";
import { ParserPR } from "./parser-pr.ts";
import { ParserGeneric } from "./parser-generic.ts";
import { extractUFFromUrl } from "../utils.ts";

export function getParser(url: string): Parser {
  const uf = extractUFFromUrl(url);
  const normalizedUf = uf.toUpperCase().trim();

  switch (normalizedUf) {
    case "SP":
      return new ParserSP();
    case "RS":
      return new ParserRS();
    case "PR":
      return new ParserPR();
    default:
      return new ParserGeneric(normalizedUf);
  }
}
