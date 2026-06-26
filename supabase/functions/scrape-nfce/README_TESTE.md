# Guia de Teste da Edge Function `scrape-nfce`

## Pré-requisitos
1. Edge Function já implantada no Supabase
2. Projeto Trip configurado com Supabase
3. Chaves de API do Supabase

---

## Passo 1: Testar usando o Dashboard do Supabase
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto Trip
3. Vá para **Edge Functions** > **scrape-nfce**
4. Clique em **"Trigger"** para abrir o painel de teste
5. Use o seguinte payload JSON:

```json
{
  "url": "https://www.nfce.fazenda.sp.gov.br/nfce/qrcode?p=35260642591651178988650010000378681461918593|2|1|1|84C0D7D89D333582D0D9456815D056E1548AC390",
  "comprovanteId": "SEU_COMPROVANTE_ID_AQUI"
}
```

6. Clique em **"Send Request"**

---

## Passo 2: Testar via cURL
```bash
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/scrape-nfce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -d '{
    "url": "https://www.nfce.fazenda.sp.gov.br/nfce/qrcode?p=35260642591651178988650010000378681461918593|2|1|1|84C0D7D89D333582D0D9456815D056E1548AC390",
    "comprovanteId": "SEU_COMPROVANTE_ID_AQUI"
  }'
```

---

## Passo 3: Testar localmente (com Deno)
1. Instale o Deno (se não tiver): https://deno.land/
2. Vá para a pasta da função:
   ```bash
   cd supabase/functions/scrape-nfce
   ```
3. Execute o servidor local do Supabase (opcional):
   ```bash
   supabase functions serve
   ```
4. Use o arquivo `test-local.ts` para testar

---

## Payload Esperado
A Edge Function espera o seguinte JSON no corpo da requisição:
```typescript
{
  url: string;           // URL completa do QR Code da NFC-e
  comprovanteId: string; // ID do comprovante no banco de dados
}
```

---

## Resposta Esperada (Sucesso)
```json
{
  "success": true,
  "data": {
    "chaveAcesso": "35260642591651178988650010000378681461918593",
    "uf": "SP",
    "emitente": "ARCOS DOURADOS COMERCIO DE ALIMENTOS SA",
    "cnpj": "42591651000188",
    "ie": "407368052119",
    "numero": "37868",
    "serie": "1",
    "protocolo": "135264219755219",
    "dataEmissao": "22/06/2026 14:06:52",
    "valorTotal": 53.90,
    "consumidor": "401.111.328-00",
    "formaPagamento": "Cartão de Débito",
    "tributos": 4.80,
    "urlConsulta": "https://www.nfce.fazenda.sp.gov.br/nfce/qrcode?p=...",
    "produtos": [
      {
        "descricao": "Copo Beckham",
        "codigo": "65018",
        "quantidade": 1,
        "unidade": "UN",
        "valorUnitario": 10.90,
        "valorTotal": 10.90
      }
    ]
  }
}
```

---

## Resposta de Erro
```json
{
  "error": "Failed to fetch page: 403 Forbidden"
}
```

---

## Dados da NFC-e da Imagem de Teste
| Campo | Valor |
|-------|-------|
| Chave de Acesso | 3526 0642 5916 5117 8988 6500 1000 0378 6814 6191 8593 |
| CNPJ Emitente | 42.591.651/0001-88 |
| IE Emitente | 407.368.052.119 |
| Número da Nota | 000037868 |
| Série | 001 |
| Data de Emissão | 22/06/2026 14:06:52 |
| Valor Total | R$ 53,90 |
| Tributos | R$ 4,80 |
| Forma de Pagamento | Cartão de Débito |