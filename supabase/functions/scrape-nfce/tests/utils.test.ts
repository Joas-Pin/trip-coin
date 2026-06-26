import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseCurrency, validateUrl, validateUUID } from "../utils.ts";

Deno.test("parseCurrency - valores válidos", () => {
  assertEquals(parseCurrency("R$ 123,45"), 123.45);
  assertEquals(parseCurrency("R$ 1.234,56"), 1234.56);
  assertEquals(parseCurrency("123,45"), 123.45);
  assertEquals(parseCurrency("1.234,56"), 1234.56);
  assertEquals(parseCurrency("R$123.45"), 123.45);
});

Deno.test("parseCurrency - valores inválidos", () => {
  assertEquals(parseCurrency(""), 0);
  assertEquals(parseCurrency(null), 0);
  assertEquals(parseCurrency(undefined), 0);
  assertEquals(parseCurrency("abc"), 0);
});

Deno.test("validateUrl - URLs válidas", () => {
  assertEquals(validateUrl("https://www.sefaz.sp.gov.br/nfce"), true);
  assertEquals(validateUrl("http://sefaz.rs.gov.br/nfe"), true);
  assertEquals(validateUrl("https://fazenda.pr.gov.br/nfce"), true);
});

Deno.test("validateUrl - URLs inválidas", () => {
  assertEquals(validateUrl(""), false);
  assertEquals(validateUrl("google.com"), false);
  assertEquals(validateUrl("ftp://example.com"), false);
});

Deno.test("validateUUID - UUIDs válidos", () => {
  assertEquals(validateUUID("550e8400-e29b-41d4-a716-446655440000"), true);
  assertEquals(validateUUID("123e4567-e89b-12d3-a456-426614174000"), true);
});

Deno.test("validateUUID - UUIDs inválidos", () => {
  assertEquals(validateUUID(""), false);
  assertEquals(validateUUID("123"), false);
  assertEquals(validateUUID("550e8400e29b41d4a716446655440000"), false);
});
