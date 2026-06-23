import { createCrud } from "./_crud";
import { removeComprovante } from "./storage";

const crud = createCrud("comprovantes");

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

    // If we have text content, try OCR
    if (fileContent) {
      const extractedValue = extractValueFromText(fileContent);
      if (extractedValue) {
        valorTotal = extractedValue;
        ocrStatus = 'concluido';
      }
    }

    return crud.create({
      ...data,
      valor_total: valorTotal,
      ocr_status: ocrStatus,
    });
  }
};

export default comprovantes;

