import * as cheerio from "cheerio";
import type { Parser, NFCeData, Produto } from "../types.ts";
import { parseCurrency, extractChaveAcesso, cleanText } from "../utils.ts";

export class ParserSP implements Parser {
  async parse(html: string): Promise<NFCeData> {
    const $ = cheerio.load(html);
    const chaveAcesso = extractChaveAcesso($.html()) || "";

    // SEFAZ SP utiliza classes padrão como .txtTit para o nome do produto
    const produtos: Produto[] = [];
    
    // Varre cada linha de item da tabela de resultados
    $("#tabResult tr, #tabResultados tr, .table-nutri tr").each((_: number, element) => {
      const el = $(element);
      const descricao = cleanText(el.find(".txtTit").text());
      
      if (descricao) {
        const codigo = cleanText(el.find(".txtCod").text().replace(/[\(\)]/g, "").replace("Código:", ""));
        const qtdTexto = cleanText(el.find(".Rqtd, .R_Right, .RCenter").eq(0).text());
        const qtd = parseCurrency(qtdTexto);
        const unidade = cleanText(el.find(".RUN, .R_Right, .RCenter").eq(1).text());
        const valorUnitario = parseCurrency(el.find(".RvlUnit, .R_Right, .RCenter").eq(2).text());
        const valorTotalItem = parseCurrency(el.find(".valor").text());

        produtos.push({
          descricao,
          codigo,
          quantidade: qtd || 1,
          unidade: unidade || "UN",
          valorUnitario: valorUnitario || valorTotalItem,
          valorTotal: valorTotalItem,
        });
      }
    });

    // Extração de metadados e totais
    const valorTotal = parseCurrency($(".txtMax, .totalNfe, #totalNota, #totalNota .valor").text());
    const emitente = cleanText($(".txtEmi, #Emitente .txtMaior, #u20").first().text());
    const cnpjRaw = cleanText($(".txtEmi, #Emitente .txtCNPJ, #u21").text());
    const cnpj = cnpjRaw.replace(/\D/g, "");
    const ie = cleanText($(".txtIE, #Emitente .txtIE, #u22").text());

    // Info adicionais da nota (Número, Série, Emissão)
    const infoText = cleanText($("#infoNota, .txtCenter, #u27, #u28, #u29").text());
    const numeroMatch = infoText.match(/Número:\s*(\d+)/i);
    const serieMatch = infoText.match(/Série:\s*(\d+)/i);
    const emissaoMatch = infoText.match(/Emissão:\s*([\d\/:\s]+)/i);
    const protocoloMatch = infoText.match(/Protocolo:\s*([\d\s-]+)/i);
    
    // Extração de forma de pagamento
    const formaPagamento = cleanText($("#linhaTotal .tx, .txtPag, #u48").text());
    const tributos = parseCurrency($("#totalTributos .valor, .txtTrib, #u50").text());
    const consumidor = cleanText($("#dadosCliente .txt, #u44, #u45").text());

    return {
      chaveAcesso,
      uf: "SP",
      emitente,
      cnpj,
      ie,
      numero: numeroMatch ? numeroMatch[1] : "",
      serie: serieMatch ? serieMatch[1] : "",
      protocolo: protocoloMatch ? protocoloMatch[1].trim() : "",
      dataEmissao: emissaoMatch ? emissaoMatch[1].trim() : "",
      valorTotal,
      consumidor,
      formaPagamento,
      tributos,
      urlConsulta: "",
      produtos,
    };
  }
}