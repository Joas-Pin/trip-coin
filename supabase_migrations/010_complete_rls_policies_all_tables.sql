-- MIGRAÇÃO 010: CORREÇÃO E COMPLEMENTO DE POLÍTICAS RLS PARA TODAS AS TABELAS
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. FUNÇÕES AUXILIARES (REPETIÇÃO PARA GARANTIR EXISTÊNCIA)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'colaborador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT get_current_user_role() = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT get_current_user_role() IN ('admin', 'gestor'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. HABILITAR RLS EM TUDO E CRIAR POLÍTICAS PARA TODAS AS TABELAS (COMPLETO)
-- =============================================

-- ------------------------------
-- TABELA: profiles
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Profiles: Authenticated users can read their own profile" ON profiles;
        DROP POLICY IF EXISTS "Profiles: Authenticated users can update their own profile" ON profiles;
        DROP POLICY IF EXISTS "Profiles: Admins can manage all profiles" ON profiles;

        CREATE POLICY "Profiles: Authenticated users can read their own profile" ON profiles
            FOR SELECT TO authenticated USING (auth.uid() = id);

        CREATE POLICY "Profiles: Authenticated users can update their own profile" ON profiles
            FOR UPDATE TO authenticated USING (auth.uid() = id);

        CREATE POLICY "Profiles: Admins can manage all profiles" ON profiles
            FOR ALL TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: clientes
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
        ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Clientes: All authenticated users can view" ON clientes;
        DROP POLICY IF EXISTS "Clientes: Gestores and admins can manage" ON clientes;
        DROP POLICY IF EXISTS "Clientes: Only admins can delete" ON clientes;

        CREATE POLICY "Clientes: All authenticated users can view" ON clientes
            FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Clientes: Gestores and admins can manage" ON clientes
            FOR ALL TO authenticated USING (is_gestor());

        CREATE POLICY "Clientes: Only admins can delete" ON clientes
            FOR DELETE TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: departamentos
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departamentos') THEN
        ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Departamentos: All authenticated can view active" ON departamentos;
        DROP POLICY IF EXISTS "Departamentos: Admins/gestores can manage" ON departamentos;

        CREATE POLICY "Departamentos: All authenticated can view active" ON departamentos
            FOR SELECT TO authenticated USING (ativo IS TRUE OR ativo IS NULL);

        CREATE POLICY "Departamentos: Admins/gestores can manage" ON departamentos
            FOR ALL TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: usuario_departamento
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario_departamento') THEN
        ALTER TABLE usuario_departamento ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Usuario_departamento: Users can view their own assignments" ON usuario_departamento;
        DROP POLICY IF EXISTS "Usuario_departamento: Admins can manage all" ON usuario_departamento;

        CREATE POLICY "Usuario_departamento: Users can view their own assignments" ON usuario_departamento
            FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR is_admin() OR is_gestor());

        CREATE POLICY "Usuario_departamento: Admins can manage all" ON usuario_departamento
            FOR ALL TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: viagens
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'viagens') THEN
        ALTER TABLE viagens ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Viagens: Usuários gerenciam suas próprias viagens" ON viagens;
        DROP POLICY IF EXISTS "Viagens: Gestores/Admins gerenciam viagens do departamento" ON viagens;

        CREATE POLICY "Viagens: Usuários gerenciam suas próprias viagens" ON viagens
            FOR ALL TO authenticated
            USING (auth.uid() = solicitante_id)
            WITH CHECK (auth.uid() = solicitante_id);

        CREATE POLICY "Viagens: Gestores/Admins gerenciam viagens do departamento" ON viagens
            FOR ALL TO authenticated
            USING (
                is_admin() OR 
                is_gestor()
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: trajetos
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trajetos') THEN
        ALTER TABLE trajetos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Trajetos: Acessíveis via viagem relacionada" ON trajetos;

        CREATE POLICY "Trajetos: Acessíveis via viagem relacionada" ON trajetos
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM viagens 
                    WHERE viagens.id = trajetos.viagem_id 
                    AND (
                        viagens.solicitante_id = auth.uid() OR 
                        is_admin() OR 
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: despesas_diarias
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'despesas_diarias') THEN
        ALTER TABLE despesas_diarias ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Despesas_diarias: Acessíveis via viagem" ON despesas_diarias;

        CREATE POLICY "Despesas_diarias: Acessíveis via viagem" ON despesas_diarias
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM viagens 
                    WHERE viagens.id = despesas_diarias.viagem_id 
                    AND (
                        viagens.solicitante_id = auth.uid() OR 
                        is_admin() OR 
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: taxas_antecipadas
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taxas_antecipadas') THEN
        ALTER TABLE taxas_antecipadas ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Taxas_antecipadas: Acessíveis via viagem" ON taxas_antecipadas;

        CREATE POLICY "Taxas_antecipadas: Acessíveis via viagem" ON taxas_antecipadas
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM viagens 
                    WHERE viagens.id = taxas_antecipadas.viagem_id 
                    AND (
                        viagens.solicitante_id = auth.uid() OR 
                        is_admin() OR 
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: calculos_alimentacao
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calculos_alimentacao') THEN
        ALTER TABLE calculos_alimentacao ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Calculos_alimentacao: Acessíveis via viagem" ON calculos_alimentacao;

        CREATE POLICY "Calculos_alimentacao: Acessíveis via viagem" ON calculos_alimentacao
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM viagens 
                    WHERE viagens.id = calculos_alimentacao.viagem_id 
                    AND (
                        viagens.solicitante_id = auth.uid() OR 
                        is_admin() OR 
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: fechamentos
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fechamentos') THEN
        ALTER TABLE fechamentos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Fechamentos: Acessíveis via viagem" ON fechamentos;

        CREATE POLICY "Fechamentos: Acessíveis via viagem" ON fechamentos
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM viagens 
                    WHERE viagens.id = fechamentos.viagem_id 
                    AND (
                        viagens.solicitante_id = auth.uid() OR 
                        is_admin() OR 
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: aprovacoes
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aprovacoes') THEN
        ALTER TABLE aprovacoes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Aprovacoes: Acessíveis via fechamento" ON aprovacoes;

        CREATE POLICY "Aprovacoes: Acessíveis via fechamento" ON aprovacoes
            FOR ALL TO authenticated
            USING (
                is_admin() OR is_gestor() OR
                EXISTS (
                    SELECT 1 FROM fechamentos 
                    JOIN viagens ON fechamentos.viagem_id = viagens.id
                    WHERE fechamentos.id = aprovacoes.fechamento_id AND viagens.solicitante_id = auth.uid()
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: notificacoes
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notificacoes') THEN
        ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Notificacoes: Usuários veem suas próprias" ON notificacoes;

        CREATE POLICY "Notificacoes: Usuários veem suas próprias" ON notificacoes
            FOR ALL TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ------------------------------
-- TABELA: configuracoes (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracoes') THEN
        ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Configuracoes: Autenticados veem configurações" ON configuracoes;
        DROP POLICY IF EXISTS "Configuracoes: Apenas admins gerenciam" ON configuracoes;

        CREATE POLICY "Configuracoes: Autenticados veem configurações" ON configuracoes
            FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Configuracoes: Apenas admins gerenciam" ON configuracoes
            FOR ALL TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: configuracoes_financeiras (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracoes_financeiras') THEN
        ALTER TABLE configuracoes_financeiras ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Configuracoes Financeiras: Autenticados veem configurações" ON configuracoes_financeiras;
        DROP POLICY IF EXISTS "Configuracoes Financeiras: Apenas admins gerenciam" ON configuracoes_financeiras;

        CREATE POLICY "Configuracoes Financeiras: Autenticados veem configurações" ON configuracoes_financeiras
            FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Configuracoes Financeiras: Apenas admins gerenciam" ON configuracoes_financeiras
            FOR ALL TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: comprovantes (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comprovantes') THEN
        ALTER TABLE comprovantes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Comprovantes: Usuários gerenciam seus comprovantes" ON comprovantes;

        CREATE POLICY "Comprovantes: Usuários gerenciam seus comprovantes" ON comprovantes
            FOR ALL TO authenticated
            USING (
                -- Usuário é dono da viagem vinculada OU admin/gestor
                EXISTS (
                    SELECT 1 FROM viagens
                    WHERE viagens.id = comprovantes.viagem_id
                    AND (
                        viagens.solicitante_id = auth.uid() OR
                        is_admin() OR
                        is_gestor()
                    )
                )
            );
    END IF;
END $$;

-- ------------------------------
-- TABELA: audit_logs (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Audit_logs: Apenas admins veem" ON audit_logs;

        CREATE POLICY "Audit_logs: Apenas admins veem" ON audit_logs
            FOR SELECT TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: departamento_audit_logs (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departamento_audit_logs') THEN
        ALTER TABLE departamento_audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Departamento_audit_logs: Apenas admins veem" ON departamento_audit_logs;

        CREATE POLICY "Departamento_audit_logs: Apenas admins veem" ON departamento_audit_logs
            FOR SELECT TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: rate_limit_logs (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limit_logs') THEN
        ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Rate_limit_logs: Apenas admins veem" ON rate_limit_logs;

        CREATE POLICY "Rate_limit_logs: Apenas admins veem" ON rate_limit_logs
            FOR SELECT TO authenticated USING (is_admin());
    END IF;
END $$;

-- ------------------------------
-- TABELA: login_audit_logs (apenas se existir)
-- ------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_audit_logs') THEN
        ALTER TABLE login_audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Login_audit_logs: Apenas admins veem" ON login_audit_logs;

        CREATE POLICY "Login_audit_logs: Apenas admins veem" ON login_audit_logs
            FOR SELECT TO authenticated USING (is_admin());
    END IF;
END $$;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
