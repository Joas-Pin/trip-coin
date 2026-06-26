import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseCurrency, extractChaveAcesso, extractUFFromUrl, validateNFCeUrl } from "./utils.ts";

Deno.test("parseCurrency - valores com R$", () => {
  assertEquals(parseCurrency("R$ 123,45"), 123.45);
  assertEquals(parseCurrency("R$1.234,56"), 1234.56);
});

Deno.test("extractChaveAcesso - chave válida", () => {
  const chave = "12345678901234567890123456789012345678901234";
  assertEquals(extractChaveAcesso(`Texto com chave ${chave} no meio`), chave);
});

Deno.test("extractUFFromUrl - detecta UF", () => {
  assertEquals(extractUFFromUrl("https://www.sefaz.sp.gov.br/nfce"), "SP");
  assertEquals(extractUFFromUrl("https://www.sefazrs.gov.br/nfce"), "RS");
  assertEquals(extractUFFromUrl("https://www.fazenda.pr.gov.br/nfce"), "PR");
});

Deno.test("validateNFCeUrl - valida URLs", () => {
  assertEquals(validateNFCeUrl("https://www.sefaz.sp.gov.br/nfce"), true);
  assertEquals(validateNFCeUrl("https://example.com"), false);
});
