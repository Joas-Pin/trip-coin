-- =============================================
-- SCRIPT: Delete em Cascata (Versão CORRIGIDA!)
-- Objetivo: Deletar em ORDEM CORRETA para não violar foreign keys!
-- Execute este script no Editor SQL do Supabase!
-- =============================================

-- =============================================
-- 1. Primeiro, vamos garantir que TODAS as foreign keys existem com ON DELETE CASCADE!
-- =============================================

-- Tabela notificacoes (viagem_id)
DO $$ BEGIN
  ALTER TABLE notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notificacoes
  ADD CONSTRAINT notificacoes_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela usuario_departamento (usuario_id)
DO $$ BEGIN
  ALTER TABLE usuario_departamento
  DROP CONSTRAINT IF EXISTS usuario_departamento_usuario_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE usuario_departamento
  ADD CONSTRAINT usuario_departamento_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela viagens (solicitante_id)
DO $$ BEGIN
  ALTER TABLE viagens
  DROP CONSTRAINT IF EXISTS viagens_solicitante_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE viagens
  ADD CONSTRAINT viagens_solicitante_id_fkey
  FOREIGN KEY (solicitante_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela trajetos (viagem_id)
DO $$ BEGIN
  ALTER TABLE trajetos
  DROP CONSTRAINT IF EXISTS trajetos_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE trajetos
  ADD CONSTRAINT trajetos_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela despesas_diarias (viagem_id)
DO $$ BEGIN
  ALTER TABLE despesas_diarias
  DROP CONSTRAINT IF EXISTS despesas_diarias_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE despesas_diarias
  ADD CONSTRAINT despesas_diarias_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela taxas_antecipadas (viagem_id)
DO $$ BEGIN
  ALTER TABLE taxas_antecipadas
  DROP CONSTRAINT IF EXISTS taxas_antecipadas_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE taxas_antecipadas
  ADD CONSTRAINT taxas_antecipadas_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela calculos_alimentacao (viagem_id)
DO $$ BEGIN
  ALTER TABLE calculos_alimentacao
  DROP CONSTRAINT IF EXISTS calculos_alimentacao_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE calculos_alimentacao
  ADD CONSTRAINT calculos_alimentacao_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela fechamentos (viagem_id)
DO $$ BEGIN
  ALTER TABLE fechamentos
  DROP CONSTRAINT IF EXISTS fechamentos_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE fechamentos
  ADD CONSTRAINT fechamentos_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela aprovacoes (fechamento_id)
DO $$ BEGIN
  ALTER TABLE aprovacoes
  DROP CONSTRAINT IF EXISTS aprovacoes_fechamento_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE aprovacoes
  ADD CONSTRAINT aprovacoes_fechamento_id_fkey
  FOREIGN KEY (fechamento_id) REFERENCES fechamentos(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tabela comprovantes (viagem_id)
DO $$ BEGIN
  ALTER TABLE comprovantes
  DROP CONSTRAINT IF EXISTS comprovantes_viagem_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE comprovantes
  ADD CONSTRAINT comprovantes_viagem_id_fkey
  FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- 2. FUNÇÃO: Deleta todos os registros relacionados a um perfil na ORDEM CORRETA!
-- =============================================
CREATE OR REPLACE FUNCTION public.delete_profile_cascade(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE 'Iniciando deleção em cascata para perfil ID: %', p_profile_id;

  -- ORDEM CORRETA: Comece pelas tabelas que DEPENDEM de outras!
  -- 1. Aprovacoes (depende de fechamentos)
  DELETE FROM public.aprovacoes WHERE fechamento_id IN (
    SELECT id FROM public.fechamentos WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id)
  );
  RAISE NOTICE 'Aprovacoes deletadas';

  -- 2. Fechamentos (depende de viagens)
  DELETE FROM public.fechamentos WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Fechamentos deletados';

  -- 3. Comprovantes (depende de viagens)
  DELETE FROM public.comprovantes WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Comprovantes deletados';

  -- 4. Calculos_alimentacao (depende de viagens)
  DELETE FROM public.calculos_alimentacao WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Calculos_alimentacao deletados';

  -- 5. Taxas_antecipadas (depende de viagens)
  DELETE FROM public.taxas_antecipadas WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Taxas_antecipadas deletados';

  -- 6. Despesas_diarias (depende de viagens)
  DELETE FROM public.despesas_diarias WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Despesas_diarias deletados';

  -- 7. Trajetos (depende de viagens)
  DELETE FROM public.trajetos WHERE viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Trajetos deletados';

  -- 8. Notificacoes (depende de viagens ou de user_id)
  DELETE FROM public.notificacoes WHERE user_id = p_profile_id OR viagem_id IN (SELECT id FROM public.viagens WHERE solicitante_id = p_profile_id);
  RAISE NOTICE 'Notificacoes deletadas';

  -- 9. Usuario_departamento (depende de profiles)
  DELETE FROM public.usuario_departamento WHERE usuario_id = p_profile_id;
  RAISE NOTICE 'Usuario_departamento deletados';

  -- 10. Viagens (depende de profiles)
  DELETE FROM public.viagens WHERE solicitante_id = p_profile_id;
  RAISE NOTICE 'Viagens deletadas';

  -- 11. Por fim, deletar o próprio perfil
  DELETE FROM public.profiles WHERE id = p_profile_id;
  RAISE NOTICE 'Perfil deletado com sucesso!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO na deleção: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. TRIGGER: Quando um auth.user é deletado, deleta tudo automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.on_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Usuário auth.users deletado (ID: %), iniciando deleção em cascata...', OLD.id;
  -- Chama a função de deleção em cascata para o perfil do usuário deletado
  PERFORM public.delete_profile_cascade(OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_deleted();

-- =============================================
-- 4. Trigger adicional: Quando um perfil é deletado manualmente
-- =============================================
CREATE OR REPLACE FUNCTION public.on_profile_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Se quiser DELETAR o auth.users também quando deletar o perfil, descomente a linha abaixo:
  -- DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_deleted();

-- =============================================
-- FIM DO SCRIPT (VERSÃO CORRIGIDA!)
-- =============================================
