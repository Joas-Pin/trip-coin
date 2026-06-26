export interface Produto {
  codigo?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface NFCeData {
  chaveAcesso: string;
  uf: string;
  emitente: string;
  cnpj: string;
  ie?: string;
  numero: string;
  serie: string;
  protocolo?: string;
  dataEmissao: string;
  valorTotal: number;
  consumidor?: string;
  formaPagamento?: string;
  tributos?: number;
  urlConsulta: string;
  produtos: Produto[];
}

export interface Parser {
  parse(html: string): Promise<NFCeData>;
}
