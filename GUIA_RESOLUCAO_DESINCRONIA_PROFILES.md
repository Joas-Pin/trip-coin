# Guia de Resolução: Desincronia entre auth.users e profiles

## Problema
Usuários autenticados (ex: Google OAuth) existem em auth.users mas NÃO tem registro em profiles.

---

## Passo 1: Executar o script SQL para Criar Trigger e Backfill!
1. Acesse o **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copie o conteúdo do arquivo `supabase_migrations/011_auto_profile_creation_and_backfill.sql`
3. Execute!
4. Verifique o resultado da query final para confirmar que:
   - O trigger `on_auth_user_created` foi criado!
   - O backfill foi executado e os perfis faltantes foram adicionados!

---

## Passo 2: Verificar as políticas RLS da tabela profiles!
As políticas atuais (de 010_complete_rls_policies_all_tables.sql):
- "Profiles: Authenticated users can read their own profile
- "Profiles: Authenticated users can update their own profile
- "Profiles: Admins can manage all profiles

Essas permitem que o próprio usuário e admins inserir/atualizar seu perfil, mas com o trigger do Passo 1, o perfil é criado automaticamente pelo banco, então não depende mais só do frontend!

---

## Passo 3: Logging melhorado no frontend!
Atualizamos `ensureProfileForUser` em `src/api/profiles.js` para adicionar logs detalhados, assim podemos verificar no console do navegador:
- Quando a função inicia
- Se o perfil existe
- Se cria o perfil novo
- Qualquer erro!

---

## Passo 4: Testar!
1. Crie uma conta de teste via Google OAuth!
2. Verifique se o perfil foi criado em profiles automaticamente!
3. Verifique os logs no DevTools do navegador!

---

## Arquivos modificados/criados:
1. `src/api/profiles.js`: Logging melhorado em ensureProfileForUser
2. `supabase_migrations/011_auto_profile_creation_and_backfill.sql`: Trigger + backfill!
