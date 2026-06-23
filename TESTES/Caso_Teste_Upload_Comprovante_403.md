
# CASO DE TESTE ESTRUTURADO
## Título: Upload de Comprovante - Erro 403 (Violando Política RLS)

---

## Dados do Teste
| Campo | Valor |
|-------|-------|
| Data de Execução | 2026-06-19 |
| Ambiente | Desenvolvimento Local |
| Versão do Sistema | Atual |
| Testador | QA/Dev |

---

## Pré-condições
1. Aplicativo em execução em `http://localhost:5174`
2. Usuário autenticado
3. Viagem existente no sistema (para associar comprovante)
4. Arquivo de comprovante válido (PDF/PNG/JPG, &lt;10MB)
5. Políticas RLS de Storage em estado que CAUSA o erro 403 (para reproduzir o problema)

---

## Arquivo de Teste
- **Nome do arquivo**: `comprovante-teste.jpg` (arquivo da imagem fornecida)
- **Tipo**: Imagem JPEG
- **Tamanho**: Verificado (menor que 10MB)
- **Caminho**: Arquivo fornecido pelo usuário

---

## Passos do Teste

### 1. Preparação do Ambiente
   a. Certifique-se que o bucket `comprovantes` existe no Supabase Storage
   b. Certifique-se que as políticas RLS estão no estado que causa o erro 403
   c. Autentique-se no sistema com um usuário válido
   d. Navegue até uma página de detalhes de viagem existente

### 2. Realizar o Upload do Arquivo
   a. Clique no botão de upload de comprovante
   b. Selecione o arquivo `comprovante-teste.jpg`
   c. Acompanhe o processo de upload no frontend

### 3. Validação da Resposta
   a. Capture a resposta da API de upload
   b. Verifique o código de status da resposta
   c. Verifique a descrição do erro
   d. Verifique a mensagem de erro

### 4. Documentação do Resultado
   a. Compare a resposta obtida com a esperada
   b. Registre discrepâncias (se houver)
   c. Capture logs detalhados da requisição/resposta

---

## Resultado Esperado (Passo 3)
```json
{
  "statusCode": "403",
  "error": "Unauthorized",
  "message": "new row violates row-level security policy"
}
```

---

## Resultado Obtido

### 1. Logs do Navegador (Console)
[Inserir logs aqui]

### 2. Resposta da API
[Inserir resposta completa aqui]

### 3. Validação dos Campos
| Campo | Valor Esperado | Valor Obtido | Status |
|-------|----------------|--------------|--------|
| statusCode | "403" | ? | ? |
| error | "Unauthorized" | ? | ? |
| message | "new row violates row-level security policy" | ? | ? |

### 4. Conclusão do Teste
[Inserir conclusão aqui]

---

## Evidências
[Inserir screenshots ou prints do console aqui]
