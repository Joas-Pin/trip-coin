
# GUIA DE SEGURANÇA - BACKEND (SUPABASE)

## Visão Geral
Este guia descreve as medidas de segurança implementadas no backend (Supabase) da aplicação de fechamento de viagens.

## Medidas Implementadas

---

## 1. POLÍTICAS RLS (ROW LEVEL SECURITY)

### Arquivo de Migração
`s005_robust_rls_policies.sql`

### O que foi feito:
- Habilitado RLS em **todas as tabelas**
- Criadas funções auxiliares: `get_current_user_role()`, `is_admin()`, `is_gestor()`
- Políticas granulares por tabela e por role

### Exemplos de Políticas:
#### Tabela `viagens`:
- Usuários só veem/edita suas próprias viagens
- Gestores veem viagens do seu departamento
- Admins tem acesso total

#### Tabela `profiles`:
- Usuários só veem/editam seu próprio perfil
- Admins gerenciam todos perfis

#### Tabela `clientes`:
- Todos usuários autenticados veem clientes
- Apenas gestores/admins criam/edita
- Apenas admins deletam

---

## 2. SANITIZAÇÃO E VALIDAÇÃO NO BANCO

### Arquivo de Migração
`006_sanitization_validation_functions.sql`

### Funções Implementadas:
1. **`detect_sql_injection(input_text)`**:
   - Detecta padrões comuns de SQLi
   - Bloqueia keywords como SELECT/INSERT/DELETE, --, OR 1=1, etc.

2. **`sanitize_text(input_text)`**:
   - Remove caracteres de controle
   - Remove &lt;&gt;"'`/ (caracteres perigosos para XSS)
   - Trim de whitespace

3. **`sanitize_object_trigger()`**:
   - Triggers automáticos nas tabelas `profiles` e `clientes`
   - Sanitiza dados **antes** de inserir/atualizar

4. **`create_profile_safe()` e `create_viagem_safe()`**:
   - Funções RPC seguras para criar perfis e viagens
   - Incluem validação e sanitização integradas

---

## 3. RATE LIMITING NO POSTGRESQL

### Arquivo de Migração
`007_rate_limiting.sql`

### Funcionalidades:
- Tabela `rate_limit_logs` para tracking de requisições
- **`check_rate_limit(user_id, action, max, window)`**:
  - Limita requisições por usuário e ação
  - Padrão: 15 requisições/minuto

- **`check_rate_limit_by_ip(ip, action, max, window)`**:
  - Para requisições não autenticadas
  - Padrão: 30 requisições/minuto

- **`check_api_rate_limit(action)`**:
  - Função RPC para usar diretamente no frontend

### Como Usar no Frontend:
```javascript
const { data, error } = await supabase.rpc('check_api_rate_limit', {
  p_action: 'create_viagem'
});

if (!data) {
  alert('Muitas requisições! Tente novamente mais tarde.');
  return;
}
```

---

## 4. SEGURANÇA DO STORAGE (BUCKET COMPROVANTES)

### Arquivo de Migração
`008_secure_storage.sql`

### Alterações Importantes:
- ✅ **Bucket passou de público para privado**
- ✅ Limite de tamanho: 10MB
- ✅ Tipos de arquivo permitidos: PDF, PNG, JPG/JPEG
- ✅ Estrutura de pastas obrigatória: `viagens/{viagem_id}/arquivo.ext`
- ✅ Apenas donos da viagem ou admins/gestores veem/delete arquivos

### Estrutura de Caminho:
```
comprovantes/
└── viagens/
    ├── 550e8400-e29b-41d4-a716-446655440000/
    │   ├── recibo_hotel.pdf
    │   └── passagem_aerea.jpg
    └── ...
```

---

## 5. SISTEMA DE AUDITORIA COMPLETO

### Arquivo de Migração
`009_complete_audit_system.sql`

### Funcionalidades:
- Tabela `audit_logs` com todos os detalhes:
  - tabela modificada
  - ação (INSERT/UPDATE/DELETE)
  - valores antigos e novos (JSONB)
  - usuário, e-mail, role
  - IP, user-agent, timestamp

- Triggers automáticos nas tabelas:
  - `viagens`
  - `profiles`
  - `clientes`
  - `departamentos`

- Funções para consulta:
  - `get_audit_logs(table_name, limit)`
  - `get_user_audit_logs(user_id, limit)`

---

## COMO EXECUTAR AS MIGRAÇÕES

### Passo a Passo:
1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá para **SQL Editor** → **New Query**
3. Execute as migrações na **ordem correta**:
   1. `005_robust_rls_policies.sql`
   2. `006_sanitization_validation_functions.sql`
   3. `007_rate_limiting.sql`
   4. `008_secure_storage.sql`
   5. `009_complete_audit_system.sql`

**Importante**: Sempre teste em um ambiente de desenvolvimento primeiro!

---

## MELHORES PRÁTICAS ADICIONAIS (RECOMENDADAS)

### 1. HABILITAR MFA (Multi-Factor Authentication)
No painel do Supabase → **Authentication** → **Providers** → **Email** → habilitar MFA

### 2. CONFIGURAR POLÍTICA DE SENHAS FORTE
No painel → **Authentication** → **Policies** → definir regras:
- Mínimo 8 caracteres
- Letras maiúsculas/minúsculas
- Números e símbolos

### 3. HABILITAR RATE LIMIT NA CAMADA DO SUPABASE
No painel → **Settings** → **API** → configurar rate limits

### 4. CONFIGURAR WEBHOOKS DE SEGURANÇA
Para alertar sobre:
- Logins suspeitos
- Muitas falhas de autenticação
- Modificações em dados sensíveis

### 5. BACKUPS REGULARES
No painel → **Database** → **Backups** → habilitar backups automáticos

---

## TESTES DE SEGURANÇA RECOMENDADOS

1. **Testar RLS**:
   - Tente acessar dados de outro usuário via API
   - Deve retornar erro ou vazio

2. **Testar SQL Injection**:
   - Envie inputs maliciosos: `' OR 1=1 --`
   - Deve ser bloqueado ou sanitizado

3. **Testar Rate Limiting**:
   - Faça 20 requisições rápidas de criar viagem
   - A 16ª deve ser bloqueada

4. **Testar Storage**:
   - Tente acessar arquivo de outra viagem
   - Deve retornar 403 Forbidden

---

## RESUMO DAS CAMADAS DE SEGURANÇA

| Camada | Medida |
|--------|--------|
| Frontend | Sanitização, Rate Limit, CSP |
| Backend (Supabase) | RLS, Funções seguras, Rate Limit |
| Banco | Triggers de sanitização, Auditoria |
| Storage | Políticas RLS, Tipos permitidos, Tamanho limite |

Lembre-se: **Segurança é um processo contínuo**, não um destino! Mantenha suas dependências atualizadas e realize auditorias periódicas.

