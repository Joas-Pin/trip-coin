import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ExtractorSP } from "../extractors/extractor-sp.ts";
import { ExtractorRS } from "../extractors/extractor-rs.ts";
import { ExtractorPR } from "../extractors/extractor-pr.ts";
import { ExtractorGeneric } from "../extractors/extractor-generic.ts";

const HTML_SP = `
<html>
  <body>
    <div class="txtMax">R$ 123,45</div>
  </body>
</html>
`;

const HTML_RS = `
<html>
  <body>
    <div id="total"><span class="valor">R$ 678,90</span></div>
  </body>
</html>
`;

const HTML_PR = `
<html>
  <body>
    <div id="valorTotal">R$ 987,65</div>
  </body>
</html>
`;

const HTML_GENERIC = `
<html>
  <body>
    <div>
      <span>Valor Total</span>
      <span>R$ 456,78</span>
    </div>
  </body>
</html>
`;

Deno.test("ExtractorSP - extrai valor", () => {
  const extractor = new ExtractorSP();
  assertEquals(extractor.extract(HTML_SP), 123.45);
});

Deno.test("ExtractorRS - extrai valor", () => {
  const extractor = new ExtractorRS();
  assertEquals(extractor.extract(HTML_RS), 678.90);
});

Deno.test("ExtractorPR - extrai valor", () => {
  const extractor = new ExtractorPR();
  assertEquals(extractor.extract(HTML_PR), 987.65);
});

Deno.test("ExtractorGeneric - extrai valor", () => {
  const extractor = new ExtractorGeneric();
  assertEquals(extractor.extract(HTML_GENERIC), 456.78);
});
