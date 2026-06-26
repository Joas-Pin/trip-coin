import * as cheerio from "cheerio";
import type { Parser, NFCeData, Produto } from "../types.ts";
import { parseCurrency, extractChaveAcesso } from "../utils.ts";

export class ParserRS implements Parser {
  async parse(html: string): Promise<NFCeData> {
    const $ = cheerio.load(html);
    const chaveAcesso = extractChaveAcesso($.html()) || "";
    const produtos: Produto[] = [];

    // O padrão do RS usa IDs estruturados ou tabelas de itens assinaladas
    $("table[id^='tabResultados'], .table-items tbody tr").each((_, element) => {
      const el = $(element);
      const nome = el.find(".txtTit, td:nth-child(1)").first().text().trim();
      
      if (nome) {
        // RS costuma separar o código junto do nome ou em colunas dedicadas
        const codigoText = el.find(".txtCod, td:nth-child(2)").text();
        const codigo = codigoText.replace(/[^0-9]/g, "").trim();
        
        const quantidade = parseCurrency(el.find(".R_Right, td:nth-child(3)").text());
        const unidade = el.find(".RCenter, td:nth-child(4)").text().trim();
        const valorUnitario = parseCurrency(el.find(".R_Right, td:nth-child(5)").text());
        const valorTotal = parseCurrency(el.find(".valor, td:nth-child(6)").text());

        produtos.push({
          nome,
          codigo,
          quantidade,
          unidade,
          valorUnitario,
          valorTotal,
        });
      }
    });

    const emitente = $("#Emitente h1, .NFCEEmitenteNome").text().trim();
    const cnpj = $("#Emitente p, .NFCEEmitenteCnpj").text().replace(/\D/g, "");
    const valorTotal = parseCurrency($("#totalNota .txtMax, .total_nota, #total Geral").text());

    // Dados gerais da nota fiscal
    const numero = $("#parNumero, .NFCEInfoNumero").text().trim();
    const serie = $("#parSerie, .NFCEInfoSerie").text().trim();
    const dataEmissao = $("#parDataEmissao, .NFCEInfoData").text().trim();

    return {
      chaveAcesso,
      uf: "RS",
      emitente,
      cnpj,
      numero,
      serie,
      dataEmissao,
      valorTotal,
      urlConsulta: "",
      produtos,
    };
  }
}