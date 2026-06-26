import * as cheerio from "cheerio";
import type { Parser, NFCeData, Produto } from "../types.ts";
import { parseCurrency, extractChaveAcesso } from "../utils.ts";

export class ParserSP implements Parser {
  async parse(html: string): Promise<NFCeData> {
    const $ = cheerio.load(html);
    const chaveAcesso = extractChaveAcesso($.html()) || "";

    // SEFAZ SP utiliza classes padrão como .txtTit para o nome do produto
    const produtos: Produto[] = [];
    
    // Varre cada linha de item da tabela de resultados
    $("#tabResultados tr, .table-nutri tr").each((_, element) => {
      const el = $(element);
      const nome = el.find(".txtTit").text().trim();
      
      if (nome) {
        const codigo = el.find(".txtCod").text().replace(/[\(\)]/g, "").replace("Código:", "").trim();
        const qtd = parseCurrency(el.find(".R_Right, .RCenter").eq(0).text());
        const unidade = el.find(".R_Right, .RCenter").eq(1).text().trim();
        const valorUnitario = parseCurrency(el.find(".R_Right, .RCenter").eq(2).text());
        const valorTotalItem = parseCurrency(el.find(".valor").text());

        produtos.push({
          nome,
          codigo,
          quantidade: qtd || 1,
          unidade: unidade || "UN",
          valorUnitario: valorUnitario || valorTotalItem,
          valorTotal: valorTotalItem,
        });
      }
    });

    // Extração de metadados e totais
    const valorTotal = parseCurrency($(".txtMax, .totalNfe, #totalNota").text());
    const emitente = $(".txtEmi, #Emitente .txtMaior").first().text().trim();
    const cnpjRaw = $(".txtEmi, #Emitente .txtCNPJ").text();
    const cnpj = cnpjRaw.replace(/\D/g, "");

    // Info adicionais da nota (Número, Série, Emissão)
    const infoText = $("#infoNota, .txtCenter").text();
    const numeroMatch = infoText.match(/Número:\s*(\d+)/i);
    const serieMatch = infoText.match(/Série:\s*(\d+)/i);
    const emissaoMatch = infoText.match(/Emissão:\s*([\d\/:\s]+)/i);

    return {
      chaveAcesso,
      uf: "SP",
      emitente,
      cnpj,
      numero: numeroMatch ? numeroMatch[1] : "",
      serie: serieMatch ? serieMatch[1] : "",
      dataEmissao: emissaoMatch ? emissaoMatch[1].trim() : "",
      valorTotal,
      urlConsulta: "",
      produtos,
    };
  }
}