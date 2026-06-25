import { createCrud } from "./_crud";
import { removeComprovante, getPublicUrl } from "./storage";
import { supabase } from "@/lib/supabase";

const crud = createCrud("comprovantes");

/**
 * Extract 44-digit NFC-e access key from URL or string
 */
export const extractChaveAcesso = (input) => {
  if (!input || typeof input !== 'string') return null;
  
  // Pattern for 44 consecutive digits
  const pattern = /\b(\d{44})\b/;
  const match = input.match(pattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Also check common query parameters like chNFe, chave, etc.
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const params = url.searchParams;
    
    // Check common parameter names
    const paramNames = ['chNFe', 'chave', 'ch', 'nfe'];
    for (const param of paramNames) {
      const value = params.get(param);
      if (value && value.length === 44 && /^\d+$/.test(value)) {
        return value;
      }
    }
  } catch (e) {
    // Not a valid URL, continue
  }
  
  return null;
};

/**
 * Extract value from text using common Brazilian currency patterns
 */
export const extractValueFromText = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Common Brazilian currency patterns
  const patterns = [
    // R$ 1.234,56 or R$1.234,56
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    // R$1234,56
    /R\$\s*(\d+,\d{2})/i,
    // 1.234,56
    /(?<!\w)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\w)/,
    // 1234,56
    /(?<!\w)(\d+,\d{2})(?!\w)/,
    // R$ 1234.56 (US format)
    /R\$\s*(\d+(?:\.\d{2})?)/i,
    // 1234.56 (US format)
    /(?<!\w)(\d+\.\d{2})(?!\w)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let valueStr = match[1];
        // Convert to standard number
        if (valueStr.includes(',')) {
          valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        }
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
};

export const comprovantes = {
  ...crud,

  async removeWithFile(id, filePath) {
    if (filePath) {
      try {
        await removeComprovante(filePath);
      } catch (e) {
        console.warn('Erro ao remover arquivo, mas removendo registro:', e);
      }
    }
    return crud.remove(id);
  },

  async createWithOCR(data, fileContent = null) {
    let valorTotal = null;
    let ocrStatus = 'pendente';

    // Check if we have a QR code URL or chave de acesso first
    const chave = extractChaveAcesso(data.qr_code_url || fileContent || '');
    
    if (chave) {
      // Mark as processing first
      ocrStatus = 'processando';
    } else if (fileContent) {
      // If no chave, try regular OCR on text content
      const extractedValue = extractValueFromText(fileContent);
      if (extractedValue) {
        valorTotal = extractedValue;
        ocrStatus = 'concluido';
      }
    }

    // Create the comprovante first
    const comprovante = await crud.create({
      ...data,
      chave_acesso: chave,
      valor_total: valorTotal,
      ocr_status: ocrStatus,
    });

    // If we have a chave, trigger the scrape (don't await so it's non-blocking)
    if (chave && comprovante) {
      // Call Supabase Edge Function
      try {
        const { error } = await supabase.functions.invoke('scrape-nfce', {
          body: {
            chaveAcesso: chave,
            comprovanteId: comprovante.id,
          },
        });

        if (error) {
          console.error('Error triggering NF-e scrape:', error);
        }
      } catch (error) {
        console.error('Error calling edge function:', error);
      }
    }

    return comprovante;
  },
};

export default comprovantes;

