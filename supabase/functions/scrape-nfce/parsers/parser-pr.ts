import * as cheerio from "cheerio";
import type { Parser, NFCeData, Produto } from "../types.ts";
import { parseCurrency, extractChaveAcesso } from "../utils.ts";

export class ParserPR implements Parser {
  async parse(html: string): Promise<NFCeData> {
    const $ = cheerio.load(html);
    const chaveAcesso = extractChaveAcesso($.html()) || "";
    const produtos: Produto[] = [];

    // Estrutura em linha do PR (comum usar seletores de tabelas fluídas)
    $(".linhaItem, tr[id^='row_']").each((_, element) => {
      const el = $(element);
      const nome = el.find(".nomeItem, .descProduto").text().trim();

      if (nome) {
        const codigo = el.find(".codProduto").text().replace(/[^0-9]/g, "");
        const quantidade = parseCurrency(el.find(".qtdItem, .quantidadeItem").text());
        const unidade = el.find(".unidadeItem, .unMedida").text().trim();
        const valorUnitario = parseCurrency(el.find(".valUnitItem, .precoUnitario").text());
        const valorTotal = parseCurrency(el.find(".valTotalItem, .precoTotal").text());

        produtos.push({
          nome,
          codigo,
          quantidade: quantidade || 1,
          unidade: unidade || "UN",
          valorUnitario: valorUnitario || valorTotal,
          valorTotal,
        });
      }
    });

    const emitente = $(".nomeContribuinte, #NomeRazaoSocial").first().text().trim();
    const cnpj = $(".cnpjContribuinte, #CnpjEmitente").text().replace(/\D/g, "");
    const valorTotal = parseCurrency($(".valorTotalNfe, #ValorTotalNota").text());
    
    // Dados extras da NF
    const numero = $("#NumeroNota, .numNota").text().replace(/\D/g, "");
    const serie = $("#SerieNota, .serieNota").text().replace(/\D/g, "");
    const dataEmissao = $("#DataEmissaoNota, .dataEmissao").text().trim();

    return {
      chaveAcesso,
      uf: "PR",
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