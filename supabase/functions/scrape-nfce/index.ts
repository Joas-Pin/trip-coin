import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { chaveAcesso, comprovanteId } = await req.json();

    if (!chaveAcesso || chaveAcesso.length !== 44) {
      return new Response(
        JSON.stringify({ error: "Invalid chave de acesso" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!comprovanteId) {
      return new Response(
        JSON.stringify({ error: "Missing comprovanteId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 1: Scrape the NF-e portal
    const valorTotal = await scrapeNfe(chaveAcesso);

    // Step 2: Update the comprovante
    if (valorTotal !== null) {
      await supabase
        .from("comprovantes")
        .update({
          valor_total: valorTotal,
          ocr_status: "concluido",
        })
        .eq("id", comprovanteId);
    } else {
      await supabase
        .from("comprovantes")
        .update({
          ocr_status: "pendente",
        })
        .eq("id", comprovanteId);
    }

    return new Response(
      JSON.stringify({ success: true, valorTotal }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-nfce function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function scrapeNfe(chaveAcesso: string): Promise<number | null> {
  const urlPortal = "https://www.nfe.fazenda.gov.br/portal/consultaResumoNFe.aspx";
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    // First request to get cookies and form data
    const response1 = await fetch(urlPortal, { headers });
    const html1 = await response1.text();
    const $ = cheerio.load(html1);

    // Extract form data
    const form = $("form").first();
    const formData = new URLSearchParams();

    // Get all input values
    form.find("input").each((_, input) => {
      const name = $(input).attr("name");
      const value = $(input).val() || "";
      if (name) {
        formData.append(name, value);
      }
    });

    // Find the chave input field
    let campoChave: string | undefined;
    form.find("input").each((_, input) => {
      const name = $(input).attr("name") || "";
      if (name.toLowerCase().includes("chave") || name.toLowerCase().includes("nfe")) {
        campoChave = name;
        return false; // break
      }
    });

    if (campoChave) {
      formData.set(campoChave, chaveAcesso);
    }

    // Find submit button
    const submitBtn = form.find('input[type="submit"]').first();
    const submitName = submitBtn.attr("name");
    const submitValue = submitBtn.val() || "";
    if (submitName) {
      formData.append(submitName, submitValue);
    }

    // Get form action
    let action = form.attr("action") || urlPortal;
    if (!action.startsWith("http")) {
      action = new URL(action, urlPortal).href;
    }

    // Second request: submit the form
    const response2 = await fetch(action, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      redirect: "follow",
    });

    const html2 = await response2.text();
    const $$ = cheerio.load(html2);

    // Extract valor total
    const valorTotal = extractValorTotal($$);
    return valorTotal;
  } catch (error) {
    console.error("Error scraping NF-e:", error);
    return null;
  }
}

function extractValorTotal($: cheerio.CheerioAPI): number | null {
  // Common search texts
  const searchTexts = [
    "valor total",
    "total da nota",
    "valor da nf",
    "total da nf-e",
    "valor total da nf-e",
  ];

  // Look through various tags
  const tags = ["td", "span", "div", "p"];

  for (const text of searchTexts) {
    for (const tag of tags) {
      const elements = $(tag);
      for (let i = 0; i < elements.length; i++) {
        const el = elements.eq(i);
        const elText = el.text().toLowerCase();
        
        if (elText.includes(text)) {
          // Try to find currency patterns in this element's text or nearby
          const patterns = [
            /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
            /R\$\s*(\d+,\d{2})/i,
            /(\d{1,3}(?:\.\d{3})*,\d{2})/,
            /(\d+,\d{2})/,
            /R\$\s*(\d+(?:\.\d{2})?)/i,
            /(\d+\.\d{2})/,
          ];

          for (const pattern of patterns) {
            const match = el.text().match(pattern);
            if (match) {
              let valorStr = match[1];
              // Convert to number
              if (valorStr.includes(",")) {
                valorStr = valorStr.replace(/\./g, "").replace(",", ".");
              }
              const valor = parseFloat(valorStr);
              if (!isNaN(valor) && valor > 0) {
                return valor;
              }
            }
          }
        }
      }
    }
  }

  return null;
}
