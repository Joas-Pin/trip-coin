
# Segurança Frontend - Documentação de Implementação

## Visão Geral

Esta documentação descreve as medidas de segurança implementadas no frontend da aplicação para proteger contra requisições não autorizadas e ataques maliciosos.

## Medidas Implementadas

### 1. Validação e Sanitização de Entradas

**Arquivos:** `src/lib/security/sanitize.js`

#### Funcionalidades:

- **Sanitização XSS (Cross-Site Scripting):**
  - Usa DOMPurify para remover tags HTML perigosas
  - Escapa caracteres especiais (&amp;, &lt;, &gt;, ", ', /)
  - Remove caracteres de controle

- **Detecção de SQL Injection:**
  - Padrões regex para detectar tentativas de injeção
  - Bloqueia comandos como SELECT, INSERT, UPDATE, DELETE, DROP, UNION
  - Detecta padrões como ' OR 1=1 --

- **Funções Disponíveis:**
  ```javascript
  // Sanitiza entrada de texto simples
  sanitizeInput(input)
  
  // Sanitiza rich text com HTML limitado
  sanitizeRichText(input)
  
  // Valida e sanitiza, lança erro se detectar ataque
  sanitizeAndValidate(input, options)
  
  // Sanitiza objetos completos
  sanitizeObject(obj)
  sanitizeAndValidateObject(obj)
  
  // Verificações individuais
  validateNoSqlInjection(input)
  validateNoXss(input)
  ```

### 2. Autenticação e Autorização

**Arquivos:** `src/lib/AuthContext.jsx`, `src/lib/security/useSecurity.jsx`

#### Funcionalidades:

- Integração com o contexto de autenticação existente
- Verificação automática de autenticação antes de requisições
- Verificação de roles (hasRole, hasAnyRole)
- Hook `useSecurity()` para acesso fácil nas components

### 3. Proteção contra CSRF (Cross-Site Request Forgery)

**Arquivos:** `src/lib/security/csrf.js`

#### Funcionalidades:

- Gera tokens CSRF seguros usando crypto.getRandomValues()
- Tokens expiram após 15 minutos
- Validação com comparação segura contra timing attacks
- Funções disponíveis:
  ```javascript
  getCsrfToken()          // Obtém ou cria token
  validateCsrfToken(token) // Valida token
  clearCsrfToken()        // Limpa token
  addCsrfProtection(data) // Adiciona token a requisições
  ```

### 4. Rate Limiting (Limitação de Requisições)

**Arquivos:** `src/lib/security/rateLimiter.js`

#### Funcionalidades:

- Limita requisições por chave (ex: 'criar-viagem', 'login')
- Padrão: 15 requisições por minuto
- Limpeza automática de requisições antigas
- Classes e funções:
  ```javascript
  // Instância singleton padrão
  rateLimiter.checkRateLimit('chave')
  rateLimiter.getRequestCount('chave')
  
  // Instâncias customizadas
  new RateLimiter({ maxRequests: 10, windowMs: 60000 })
  ```

### 5. Content Security Policy (CSP)

**Arquivos:** `index.html`, `vite.config.js`

#### Política Implementada:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com;
frame-src 'self' https://*.stripe.com;
object-src 'none';
base-uri 'self';
form-action 'self';
```

#### Cabeçalhos Adicionais:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 6. Build e Ofuscação de Código

**Arquivos:** `vite.config.js`

#### Configurações de Produção:

- Minificação com Terser
- Remoção de console.log e debugger
- Remoção de comentários
- Source maps desativados em produção
- Code splitting para caching eficiente

### 7. Wrapper de Requisições Seguras

**Arquivos:** `src/lib/security/secureRequest.js`

#### Funcionalidades:

- Combina todas as medidas de segurança em um único wrapper
- Integra rate limiting, sanitização, validação e auth
- Criação de wrappers customizados com `createSecureRequest()`

## Exemplo de Uso em Componentes

```jsx
import { useSecurity } from '@/lib/security/useSecurity';

function MeuComponente() {
  const { 
    sanitizeInput, 
    sanitizeObject,
    checkRateLimit,
    hasRole,
    secureRequest 
  } = useSecurity();

  const handleSubmit = async (dados) =&gt; {
    // Verifica rate limit
    if (!checkRateLimit('submit-form')) {
      alert('Muitas requisições!');
      return;
    }

    // Sanitiza dados
    const dadosSeguros = sanitizeObject(dados);

    // Verifica permissão
    if (!hasRole('admin')) {
      alert('Sem permissão!');
      return;
    }

    // Envia requisição segura
    await api.criar(dadosSeguros);
  };

  return (
    &lt;input 
      value={valor} 
      onChange={(e) =&gt; setValor(sanitizeInput(e.target.value))} 
    /&gt;
  );
}
```

## Testes de Segurança Realizados

### Teste 1: XSS Injection

**Cenário:** Tentativa de inserir script malicioso

**Entrada:**
```
&lt;script&gt;alert('xss')&lt;/script&gt;
```

**Resultado:** ✅ Bloqueado
- Sanitização remove tags script
- Caracteres são escapados
- Nenhum script executado

### Teste 2: SQL Injection

**Cenário:** Tentativa de injeção SQL

**Entrada:**
```
' OR 1=1 --
```

**Resultado:** ✅ Bloqueado
- Padrão detectado por regex
- sanitizeAndValidate lança erro
- Requisição não é enviada

### Teste 3: Rate Limiting

**Cenário:** Múltiplas requisições rápidas

**Ação:** 20 requisições em 10 segundos

**Resultado:** ✅ Bloqueado
- Apenas 15 primeiras requisições permitidas
- Demais são bloqueadas com aviso
- Limpeza automática após 1 minuto

### Teste 4: CSP - Fontes Externas

**Cenário:** Tentativa de carregar script de domínio não autorizado

**Resultado:** ✅ Bloqueado
- CSP bloqueia requisições para domínios não listados
- Apenas supabase.co e stripe.com permitidos
- console mostra erro de CSP

### Teste 5: Autenticação

**Cenário:** Tentativa de requisição sem login

**Resultado:** ✅ Bloqueado
- AuthContext verifica sessão
- Requisição segura verifica auth
- Usuário redirecionado para login

## Recomendações Adicionais (Backend)

⚠️ **IMPORTANTE:** As medidas frontend são uma camada adicional de segurança. O backend DEVE implementar validações equivalentes:

1. **Validar e sanitizar TODAS as entradas** no backend
2. **Implementar rate limiting no servidor** (não confie apenas no cliente)
3. **Validar tokens de autenticação** em cada requisição
4. **Implementar validação de CSRF no backend**
5. **Usar Prepared Statements** para queries SQL
6. **Configurar headers CORS adequados**
7. **Manter logs de segurança** para monitoramento

## Estrutura de Arquivos

```
src/lib/security/
├── index.js          # Exporta todos os módulos
├── sanitize.js       # Sanitização e validação
├── rateLimiter.js    # Limitação de requisições
├── csrf.js           # Proteção CSRF
├── secureRequest.js  # Wrapper de requisições
└── useSecurity.jsx   # Hook para React
```

## Como Adicionar Segurança a Novos Componentes

1. Importe o hook `useSecurity`
2. Use `sanitizeInput()` em campos de formulário
3. Use `sanitizeObject()` em objetos antes de enviar para API
4. Adicione `checkRateLimit()` em ações importantes
5. Verifique roles com `hasRole()` se necessário

## Manutenção

- Atualize regularmente as dependências (especialmente DOMPurify)
- Monitore os logs para padrões de ataque
- Teste novas features com entradas maliciosas
- Revise a política CSP ao adicionar novas integrações
