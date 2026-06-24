# Guia: Delete em Cascata para auth.users e profiles! (VERSÃO CORRIGIDA)

## Problema
Quando você tenta excluir um usuário do auth.users, recebe o erro:
- "Database error deleting user"
- Ou "update or delete on table 'viagens' violates foreign key constraint... on table 'notificacoes'"

---

## Passo 1: Executar o script SQL (AGORA CORRIGIDO!)
1. Acesse o **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copie e execute o arquivo `supabase_migrations/012_cascade_delete_auth_user.sql`

---

## O que o script CORRIGIDO faz?
1. **Garante que TODAS as foreign keys existem com ON DELETE CASCADE** (todas as tabelas!)
2. **Cria a função `delete_profile_cascade()`** que deleta TUDO na **ORDEM CORRETA** (começando pelas tabelas que DEPENDEM de outras):
   - Aprovacoes → Fechamentos → Comprovantes → Calculos_alimentacao → Taxas_antecipadas → Despesas_diarias → Trajetos → Notificacoes → Usuario_departamento → Viagens → Perfil
3. **Cria triggers**:
   - `on_auth_user_deleted`: Quando você apaga um usuário do auth.users → apaga tudo automaticamente!
   - `on_profile_deleted`: Quando você apaga um perfil manualmente → pode opcionalmente apagar o auth.user também (descomente a linha se quiser isso)!
4. **Adiciona `RAISE NOTICE` para debug** no SQL Editor!

---

## Arquivo atualizado
`supabase_migrations/012_cascade_delete_auth_user.sql`
