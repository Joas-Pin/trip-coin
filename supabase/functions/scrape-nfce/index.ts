import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import { scrapePage } from "./scraper/index.ts";
import { getParser } from "./parsers/index.ts";
import type { NFCeData } from "./types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function readJsonBody(req: Request): Promise<{ url?: string; comprovanteId?: string }> {
  const text = await req.text(); // read exactly once
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

serve(async (req: Request) => {
  let comprovanteId: string | undefined;

  try {
    const body = await readJsonBody(req);
    const { url } = body;
    comprovanteId = body.comprovanteId;

    if (!url || !url.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!comprovanteId) {
      return new Response(JSON.stringify({ error: "Missing comprovanteId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Processing NFC-e: ${url} for comprovante ${comprovanteId}`);

    const html = await scrapePage(url);

    const parser = getParser(url);
    const nfceData: NFCeData = await parser.parse(html);
    nfceData.urlConsulta = url;

    console.log("Parsed NFC-e data:", nfceData);

    const { error: updateError } = await supabase
      .from("comprovantes")
      .update({
        valor_total: nfceData.valorTotal,
        chave_acesso: nfceData.chaveAcesso,
        data_emissao: nfceData.dataEmissao,
        emitente: nfceData.emitente,
        cnpj: nfceData.cnpj,
        nfce_json: nfceData,
        ocr_status: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", comprovanteId);

    if (updateError) {
      console.error("Error updating comprovante:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, data: nfceData }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scrape-nfce function:", error);

    // No req.clone()/req.json() here: body might already be consumed
    if (comprovanteId) {
      try {
        await supabase
          .from("comprovantes")
          .update({
            ocr_status: "pendente",
            error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", comprovanteId);
      } catch (dbError) {
        console.error("Error updating comprovante with error status:", dbError);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});