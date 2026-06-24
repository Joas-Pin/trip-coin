# AUDITORIA COMPLETA DO BANCO DE DADOS E CONFIGURAÇÃO RLS

## 1. AUDITORIA DE TABELAS - ESTRUTURA COMPLETA

| Tabela | Coluna PK | Colunas FK | Outras Colunas Importantes | Relacionamentos |
|--------|-----------|------------|-----------------------------|-----------------|
| `auth.users` | `id` (UUID) | — | `email`, `email_confirmed_at`, etc. | Tabela padrão Supabase |
| `profiles` | `id` (UUID) | `id` → `auth.users.id` | `username`, `nome`, `email`, `role`, `departamento`, `avatar_url`, `created_at`, `updated_at` | — |
| `clientes` | `id` (UUID) | — | `nome`, `email`, `telefone`, `endereco`, `created_at`, `updated_at` | — |
| `departamentos` | `id` (UUID) | `gestor_id` → `profiles.id` | `nome`, `descricao`, `ativo`, `created_at` | — |
| `usuario_departamento` | `id` (UUID) | `usuario_id` → `profiles.id`, `departamento_id` → `departamentos.id`, `assigned_by` → `profiles.id` | `assigned_at` | Muitos-para-muitos profiles ↔ departamentos |
| `viagens` | `id` (UUID) | `solicitante_id` → `profiles.id`, `cliente_id` → `clientes.id` | `depto`, `data_inicio`, `data_fim`, `destino`, `motivo`, `status`, `total_estimado`, `total_real`, `created_at`, `updated_at` | — |
| `trajetos` | `id` (UUID) | `viagem_id` → `viagens.id` | `origem`, `destino`, `data_hora`, `meio_transporte`, `distancia_km`, `valor`, `created_at` | — |
| `despesas_diarias` | `id` (UUID) | `viagem_id` → `viagens.id` | `data`, `qtd_colaboradores`, `alimentacao`, `combustivel`, `estacionamento`, `taxi_uber_km`, `outros`, `observacao` | — |
| `taxas_antecipadas` | `id` (UUID) | `viagem_id` → `viagens.id` | `valor`, `justificativa`, `data`, `created_at` | — |
| `calculos_alimentacao` | `id` (UUID) | `viagem_id` → `viagens.id` | `data`, `qtd_refeicoes`, `valor_refeicao`, `total`, `created_at` | — |
| `fechamentos` | `id` (UUID) | `viagem_id` → `viagens.id`, `aprovador_id` → `profiles.id` | `data_fechamento`, `total_final`, `observacoes`, `status`, `created_at` | — |
| `aprovacoes` | `id` (UUID) | `fechamento_id` → `fechamentos.id`, `aprovador_id` → `profiles.id` | `data_aprovacao`, `comentarios`, `status`, `created_at` | — |
| `notificacoes` | `id` (UUID) | `user_id` → `profiles.id` | `titulo`, `mensagem`, `tipo`, `lida`, `created_at` | — |
| `configuracoes` | `id` (UUID) | — | `chave`, `valor`, `descricao`, `updated_at` | — |
| `audit_logs` | `id` (UUID) | `user_id` → `auth.users.id` | `table_name`, `action`, `old_values`, `new_values`, `record_id`, `user_email`, `user_role`, `ip_address`, `user_agent`, `session_id`, `created_at` | — |
| `departamento_audit_logs` | `id` (UUID) | `performed_by` → `profiles.id` | `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `performed_at` | — |
| `rate_limit_logs` | `id` (BIGSERIAL) | `user_id` → `auth.users.id` | `action`, `ip_address`, `user_agent`, `request_count`, `window_start`, `created_at` | — |
| `login_audit_logs` | ? | ? | (ver migração 001) | — |

---

## 2. IDENTIFICAÇÃO DE POLÍTICAS RLS FALTANTES

Na migração `005_robust_rls_policies.sql`, algumas tabelas NÃO tiveram políticas completas definidas! Vamos criar uma migração para completar todas:
