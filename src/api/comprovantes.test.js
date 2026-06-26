import { describe, it, expect } from 'vitest';
import { extractChaveAcesso, extractValueFromText, validateCrossCheck } from './comprovantes';

describe('extractChaveAcesso', () => {
  it('deve extrair chave de acesso de 44 dígitos de texto simples', () => {
    const input = '12345678901234567890123456789012345678901234';
    expect(extractChaveAcesso(input)).toBe(input);
  });

  it('deve extrair chave de acesso de URL', () => {
    const url = 'https://www.sefaz.sp.gov.br/nfce?chNFe=12345678901234567890123456789012345678901234';
    expect(extractChaveAcesso(url)).toBe('12345678901234567890123456789012345678901234');
  });

  it('deve retornar null para strings inválidas', () => {
    expect(extractChaveAcesso('')).toBeNull();
    expect(extractChaveAcesso('12345')).toBeNull();
    expect(extractChaveAcesso(null)).toBeNull();
  });
});

describe('extractValueFromText', () => {
  it('deve extrair valor com R$ e vírgula', () => {
    expect(extractValueFromText('Valor total: R$ 123,45')).toBe(123.45);
  });

  it('deve extrair valor com R$ e ponto como separador de milhar', () => {
    expect(extractValueFromText('Total a pagar: R$ 1.234,56')).toBe(1234.56);
  });

  it('deve extrair valor sem R$', () => {
    expect(extractValueFromText('Total da nota: 99,90')).toBe(99.90);
  });

  it('deve encontrar valor em linha que contém palavras-chave', () => {
    expect(extractValueFromText('Outro texto\nValor total R$ 50,00\nMais texto')).toBe(50.00);
  });
});

describe('validateCrossCheck', () => {
  it('deve aprovar dados consistentes', () => {
    const result = validateCrossCheck(
      { valorTotal: 100.00, chaveAcesso: '123' },
      { valorTotal: 100.50, chaveAcesso: '123' }
    );
    expect(result.valid).toBe(true);
    expect(result.discrepancies.length).toBe(0);
  });

  it('deve detectar discrepância de valor acima de 5%', () => {
    const result = validateCrossCheck(
      { valorTotal: 100.00 },
      { valorTotal: 110.00 }
    );
    expect(result.valid).toBe(false);
    expect(result.discrepancies[0].field).toBe('valorTotal');
  });

  it('deve detectar chave de acesso diferente', () => {
    const result = validateCrossCheck(
      { chaveAcesso: '123' },
      { chaveAcesso: '456' }
    );
    expect(result.valid).toBe(false);
    expect(result.discrepancies[0].field).toBe('chaveAcesso');
  });
});
