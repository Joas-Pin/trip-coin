
-- MIGRAÇÃO 005: POLÍTICAS RLS ROBUSTAS PARA TODAS AS TABELAS
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. FUNÇÕES AUXILIARES DE SEGURANÇA
-- =============================================

-- Função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT get_current_user_role() = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é gestor
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT get_current_user_role() IN ('admin', 'gestor'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. HABILITAR RLS EM TODAS AS TABELAS (se não estiver)
-- =============================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trajetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS taxas_antecipadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calculos_alimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fechamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS despesas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departamentos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. POLÍTICAS RLS PARA TABELA PROFILES
-- =============================================

DROP POLICY IF EXISTS "Profiles: Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Profiles: Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins podem ver todos perfis" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins podem atualizar todos perfis" ON profiles;

CREATE POLICY "Profiles: Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles: Admins podem ver todos perfis" ON profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Profiles: Admins podem atualizar todos perfis" ON profiles
    FOR UPDATE USING (is_admin());

CREATE POLICY "Profiles: Admins podem inserir perfis" ON profiles
    FOR INSERT WITH CHECK (is_admin());

-- =============================================
-- 4. POLÍTICAS RLS PARA TABELA CLIENTES
-- =============================================

DROP POLICY IF EXISTS "Clientes: Usuários autenticados podem ver clientes" ON clientes;
DROP POLICY IF EXISTS "Clientes: Gestores e admins podem criar/atualizar/deletar" ON clientes;

CREATE POLICY "Clientes: Usuários autenticados podem ver clientes" ON clientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Clientes: Gestores e admins podem criar clientes" ON clientes
    FOR INSERT TO authenticated WITH CHECK (is_gestor());

CREATE POLICY "Clientes: Gestores e admins podem atualizar clientes" ON clientes
    FOR UPDATE TO authenticated USING (is_gestor());

CREATE POLICY "Clientes: Somente admins podem deletar clientes" ON clientes
    FOR DELETE TO authenticated USING (is_admin());

-- =============================================
-- 5. POLÍTICAS RLS PARA TABELA VIAGENS
-- =============================================

DROP POLICY IF EXISTS "Viagens: Usuários podem ver suas próprias viagens" ON viagens;
DROP POLICY IF EXISTS "Viagens: Usuários podem criar suas próprias viagens" ON viagens;
DROP POLICY IF EXISTS "Viagens: Gestores podem ver viagens do departamento" ON viagens;
DROP POLICY IF EXISTS "Viagens: Admins podem ver todas viagens" ON viagens;

CREATE POLICY "Viagens: Usuários podem ver suas próprias viagens" ON viagens
    FOR SELECT USING (auth.uid() = solicitante_id);

CREATE POLICY "Viagens: Usuários podem criar suas próprias viagens" ON viagens
    FOR INSERT WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Viagens: Usuários podem atualizar suas próprias viagens" ON viagens
    FOR UPDATE USING (auth.uid() = solicitante_id);

CREATE POLICY "Viagens: Gestores podem ver viagens do seu departamento" ON viagens
    FOR SELECT USING (
        is_gestor() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.departamento = viagens.depto
        )
    );

CREATE POLICY "Viagens: Admins podem ver todas viagens" ON viagens
    FOR SELECT USING (is_admin());

CREATE POLICY "Viagens: Admins podem atualizar todas viagens" ON viagens
    FOR UPDATE USING (is_admin());

CREATE POLICY "Viagens: Admins podem deletar viagens" ON viagens
    FOR DELETE USING (is_admin());

-- =============================================
-- 6. POLÍTICAS RLS PARA TABELA TRAJETOS
-- =============================================

DROP POLICY IF EXISTS "Trajetos: Acessíveis via viagem relacionada" ON trajetos;

CREATE POLICY "Trajetos: Usuários podem ver trajetos de suas viagens" ON trajetos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM viagens 
            WHERE viagens.id = trajetos.viagem_id 
            AND (viagens.solicitante_id = auth.uid() OR is_admin() OR is_gestor())
        )
    );

CREATE POLICY "Trajetos: Usuários podem criar trajetos em suas viagens" ON trajetos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM viagens 
            WHERE viagens.id = trajetos.viagem_id 
            AND viagens.solicitante_id = auth.uid()
        )
    );

CREATE POLICY "Trajetos: Usuários podem atualizar trajetos de suas viagens" ON trajetos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM viagens 
            WHERE viagens.id = trajetos.viagem_id 
            AND viagens.solicitante_id = auth.uid()
        )
    );

CREATE POLICY "Trajetos: Admins podem gerenciar todos trajetos" ON trajetos
    FOR ALL USING (is_admin());

-- =============================================
-- 7. POLÍTICAS RLS PARA OUTRAS TABELAS (padrão)
-- =============================================

-- Aplicar padrão similar para outras tabelas (taxas_antecipadas, fechamentos, etc.)
-- Este é um exemplo para taxas_antecipadas - repita o padrão para outras tabelas

DROP POLICY IF EXISTS "Taxas: Acessíveis via viagem" ON taxas_antecipadas;

CREATE POLICY "Taxas: Usuários podem ver taxas de suas viagens" ON taxas_antecipadas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM viagens 
            WHERE viagens.id = taxas_antecipadas.viagem_id 
            AND (viagens.solicitante_id = auth.uid() OR is_admin() OR is_gestor())
        )
    );

CREATE POLICY "Taxas: Usuários podem criar taxas em suas viagens" ON taxas_antecipadas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM viagens 
            WHERE viagens.id = taxas_antecipadas.viagem_id 
            AND viagens.solicitante_id = auth.uid()
        )
    );

CREATE POLICY "Taxas: Admins podem gerenciar todas taxas" ON taxas_antecipadas
    FOR ALL USING (is_admin());

-- =============================================
-- 8. POLÍTICAS PARA NOTIFICAÇÕES
-- =============================================

DROP POLICY IF EXISTS "Notificacoes: Usuários veem suas próprias notificações" ON notificacoes;

CREATE POLICY "Notificacoes: Usuários veem suas próprias notificações" ON notificacoes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notificacoes: Usuários podem marcar como lidas" ON notificacoes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Notificacoes: Sistema pode criar notificações" ON notificacoes
    FOR INSERT WITH CHECK (true); -- Ajuste conforme sua necessidade

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

