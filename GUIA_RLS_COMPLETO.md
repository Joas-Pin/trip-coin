# GUIA PASSO-A-PASSO: CONFIGURAÇÃO RLS COMPLETA

## Método 1: VIA CONSULTAS SQL (Recomendado)

1. Acesse o Supabase Dashboard → **SQL Editor** → **New Query**
2. Execute as migrações na **ordem correta**:
   1. `005_robust_rls_policies.sql`
   2. `010_complete_rls_policies_all_tables.sql` (CRIADO AGORA - este completa todas as políticas!)
3. Pronto!

---

## Método 2: VIA INTERFACE GRÁFICA DO SUPABASE

Vamos usar a tabela `viagens` como exemplo — repita para todas as tabelas!

### Passo 1: Habilitar RLS na tabela
1. No painel, vá para **Table Editor**
2. Selecione a tabela (ex: `viagens`)
3. Clique em **RLS policies** → clique em **Enable RLS for this table** (se não estiver ativado)

### Passo 2: Adicionar política para usuários verem suas próprias viagens
1. Clique em **New policy**
2. Escolha **Get started quickly** → **For Enable read access to everyone** (mas vamos personalizar!)
3. Ou clique em **Create policy from scratch**
4. **Nome da política**: `Viagens: Usuários gerenciam suas próprias viagens`
5. **Comando(s) a serem permitidos**: marque **ALL** (ou SELECT, INSERT, UPDATE, DELETE individualmente)
6. **Para qual(quais) role(s)**: `authenticated`
7. **USING expression (verificação para leitura/atualização/deleção)**:
   ```sql
   auth.uid() = solicitante_id OR (get_current_user_role() IN ('admin', 'gestor'))
   ```
8. **WITH CHECK expression (verificação para inserção/atualização)**:
   ```sql
   auth.uid() = solicitante_id OR (get_current_user_role() IN ('admin', 'gestor'))
   ```
9. Clique em **Review** → **Save policy**

---

## 3. MELHORAR O FRONTEND PARA TRATAR ERROS DE RLS (EVITAR MENSAGENS NO CONSOLE)

Vamos modificar o arquivo `src/api/_utils.js` para tratar erros silenciosamente (mas logar apenas em dev!):
