import { serve } from "std/http/server.ts";
import { logger } from "./logger.ts";
import { validateUrl, validateUUID } from "./utils.ts";
import { fetchPage } from "./services/fetch-page.ts";
import { extractTotal } from "./services/total-extractor.ts";
import { updateStatus, updateValor, updateErro } from "./services/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handleRequest(req: Request): Promise<Response> {
  const startTime = Date.now();
  let comprovanteId: string | null = null;

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const { url, comprovanteId: id } = body;
    comprovanteId = id;

    logger.info("Request received", { hasUrl: !!url, hasComprovanteId: !!comprovanteId });

    if (!validateUrl(url)) {
      return new Response(
        JSON.stringify({ success: false, message: "URL inválida ou não reconhecida como NFC-e" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!comprovanteId || !validateUUID(comprovanteId)) {
      return new Response(
        JSON.stringify({ success: false, message: "ID do comprovante inválido ou ausente" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await updateStatus(comprovanteId, "processando");

    const html = await fetchPage(url);
    const valorTotal = await extractTotal(html);

    await updateValor(comprovanteId, valorTotal);

    logger.info("Request completed", {
      url,
      comprovanteId,
      valorTotal,
      duration: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ success: true, valorTotal }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error("Request failed", {
      comprovanteId,
      error: message,
      duration: Date.now() - startTime,
    });

    if (comprovanteId) {
      try {
        await updateErro(comprovanteId, message);
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

serve(handleRequest);
