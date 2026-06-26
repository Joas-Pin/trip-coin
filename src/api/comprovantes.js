import { createCrud } from "./_crud";
import { removeComprovante, getPublicUrl } from "./storage";
import { supabase } from "@/lib/supabase";

export const extractChaveAcesso = (input) => {
  if (!input || typeof input !== "string") return null;
  const pattern = /\b(\d{44})\b/;
  const match = input.match(pattern);
  if (match && match[1]) return match[1];
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const params = url.searchParams;
    const paramNames = ["chNFe", "chave", "ch", "nfe"];
    for (const param of paramNames) {
      const value = params.get(param);
      if (value && value.length === 44 && /^\d+$/.test(value)) return value;
    }
  } catch (e) { /* continue */ }
  return null;
};

const BRL_CURRENCY_PATTERNS = [
  /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  /R\$\s*(\d+,\d{2})/i,
  /(?<!\w)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\w)/,
  /(?<!\w)(\d+,\d{2})(?!\w)/,
  /R\$\s*(\d+(?:\.\d{2})?)/i,
  /(?<!\w)(\d+\.\d{2})(?!\w)/,
];

const TOTAL_KEYWORDS = [
  "valor total", "total da nota", "total a pagar", "total",
  "total do cupom", "total geral", "valor a pagar"
];

export const extractValueFromText = (text) => {
  if (!text || typeof text !== "string") return null;
  const lines = text.split(/\r?\n/).map(line => line.trim().toLowerCase());

  // First pass: look for lines containing total keywords
  for (const line of lines) {
    if (TOTAL_KEYWORDS.some(keyword => line.includes(keyword))) {
      for (const pattern of BRL_CURRENCY_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          let valueStr = match[1];
          if (valueStr.includes(",")) {
            valueStr = valueStr.replace(/\./g, "").replace(",", ".");
          }
          const value = parseFloat(valueStr);
          if (!isNaN(value) && value > 0) return value;
        }
      }
    }
  }

  // Second pass: look for any currency value
  for (const pattern of BRL_CURRENCY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        let valueStr = match[1];
        if (valueStr.includes(",")) {
          valueStr = valueStr.replace(/\./g, "").replace(",", ".");
        }
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) return value;
      } catch (e) { /* continue */ }
    }
  }

  return null;
};

export const validateCrossCheck = (qrData, ocrData) => {
  const results = {
    valid: true,
    discrepancies: [],
  };

  if (qrData.valorTotal && ocrData.valorTotal) {
    const qrValue = parseFloat(qrData.valorTotal);
    const ocrValue = parseFloat(ocrData.valorTotal);
    const diff = Math.abs(qrValue - ocrValue);
    const allowedDiff = Math.max(qrValue, ocrValue) * 0.05; // 5% tolerance

    if (diff > allowedDiff) {
      results.valid = false;
      results.discrepancies.push({
        field: "valorTotal",
        qr: qrValue,
        ocr: ocrValue,
        diff,
      });
    }
  }

  if (qrData.chaveAcesso && ocrData.chaveAcesso) {
    if (qrData.chaveAcesso !== ocrData.chaveAcesso) {
      results.valid = false;
      results.discrepancies.push({
        field: "chaveAcesso",
        qr: qrData.chaveAcesso,
        ocr: ocrData.chaveAcesso,
      });
    }
  }

  return results;
};

export const comprovantes = {
  ...createCrud("comprovantes"),

  async removeWithFile(id, filePath) {
    if (filePath) {
      try {
        await removeComprovante(filePath);
      } catch (e) {
        console.warn("Erro ao remover arquivo, mas removendo registro:", e);
      }
    }
    return this.remove(id);
  },

  async createWithOCR(data, fileContent = null) {
    let valorTotal = null;
    let ocrStatus = "pendente";
    let qrCodeUrl = data.qr_code_url || null;
    let chave = null;

    if (qrCodeUrl) {
      chave = extractChaveAcesso(qrCodeUrl);
      ocrStatus = "processando";
    } else if (fileContent) {
      const extractedValue = extractValueFromText(fileContent);
      if (extractedValue) {
        valorTotal = extractedValue;
        ocrStatus = "concluido";
      }
    }

    const comprovante = await this.create({
      ...data,
      chave_acesso: chave,
      valor_total: valorTotal,
      ocr_status: ocrStatus,
    });

    if (qrCodeUrl && comprovante) {
      try {
        const { data: res, error } = await supabase.functions.invoke("scrape-nfce", {
          body: JSON.stringify({
            url: qrCodeUrl,
            comprovanteId: comprovante.id,
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (error) {
          console.error("Error triggering NF-e scrape:", error);
        } else {
          console.log("NF-e scrape triggered successfully:", res);
        }
      } catch (error) {
        console.error("Error calling edge function:", error);
      }
    }

    return comprovante;
  },

  async retryScrape(comprovanteId, qrCodeUrl) {
    if (!comprovanteId || !qrCodeUrl) {
      throw new Error("ID do comprovante e URL do QR Code são obrigatórios");
    }

    await this.update(comprovanteId, {
      ocr_status: "processando",
      error_message: null,
    });

    const { data: res, error } = await supabase.functions.invoke("scrape-nfce", {
      body: JSON.stringify({
        url: qrCodeUrl,
        comprovanteId,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (error) {
      console.error("Error retrying NF-e scrape:", error);
      throw error;
    }

    return res;
  },
};

export default comprovantes;
