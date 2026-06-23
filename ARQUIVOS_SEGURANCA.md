
# LISTA DE ARQUIVOS DE SEGURANÇA CRIADOS/ATUALIZADOS

## Frontend
- `src/lib/security/sanitize.js` - Sanitização e validação (XSS/SQLi)
- `src/lib/security/rateLimiter.js` - Rate limiting client-side
- `src/lib/security/csrf.js` - Proteção CSRF
- `src/lib/security/secureRequest.js` - Wrapper de requisições seguras
- `src/lib/security/useSecurity.jsx` - Hook React para segurança
- `src/lib/security/supabase-secure.js` - Wrapper para Supabase RPC
- `src/lib/security/index.js` - Arquivo de exportação principal
- `index.html` - Adicionado CSP (Content Security Policy)
- `vite.config.js` - Headers de segurança e build config
- `src/pages/CriarViagem.jsx` - Atualizado para usar sanitização

## Backend (Supabase Migrations)
- `supabase_migrations/005_robust_rls_policies.sql` - Políticas RLS robustas
- `supabase_migrations/006_sanitization_validation_functions.sql` - Sanitização/Validação SQL
- `supabase_migrations/007_rate_limiting.sql` - Rate limiting no banco
- `supabase_migrations/008_secure_storage.sql` - Segurança do Storage
- `supabase_migrations/009_complete_audit_system.sql` - Sistema de auditoria

## Documentação
- `SEGURANCA.md` - Guia de segurança frontend
- `SEGURANCA_BACKEND.md` - Guia de segurança backend

