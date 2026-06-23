
-- MIGRAÇÃO 004: Gerenciamento Completo de Departamentos e Auditoria
-- Execute este script no Editor SQL do Supabase

-- 1. ATUALIZAR TABELA DEPARTAMENTOS (adicionar campos obrigatórios)
ALTER TABLE departamentos 
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Garantir que nome do departamento é único
ALTER TABLE departamentos 
ADD CONSTRAINT IF NOT EXISTS departamentos_nome_key UNIQUE (nome);

-- 2. CRIAR TABELA DE ATRIBUIÇÃO USUÁRIO-DEPARTAMENTO (muitos-para-muitos)
CREATE TABLE IF NOT EXISTS usuario_departamento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    departamento_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    
    -- Garantir que não há vínculos duplicados
    CONSTRAINT usuario_departamento_unique UNIQUE (usuario_id, departamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuario_departamento_usuario ON usuario_departamento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_departamento_departamento ON usuario_departamento(departamento_id);

-- 3. CRIAR TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS departamento_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN'
    entity_type TEXT NOT NULL, -- 'DEPARTMENT', 'ASSIGNMENT'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_departamento_audit_action ON departamento_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_departamento_audit_entity ON departamento_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_departamento_audit_performed_at ON departamento_audit_logs(performed_at DESC);

-- 4. HABILITAR RLS (se não estiver)
ALTER TABLE usuario_departamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamento_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS
-- Políticas para usuario_departamento: apenas admins podem modificar
CREATE POLICY IF NOT EXISTS "Admins podem ver todas atribuições" ON usuario_departamento
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY IF NOT EXISTS "Admins podem criar atribuições" ON usuario_departamento
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY IF NOT EXISTS "Admins podem atualizar atribuições" ON usuario_departamento
FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY IF NOT EXISTS "Admins podem deletar atribuições" ON usuario_departamento
FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Políticas para departamento_audit_logs: apenas admins podem ver/inserir
CREATE POLICY IF NOT EXISTS "Admins podem ver logs de auditoria" ON departamento_audit_logs
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY IF NOT EXISTS "Admins podem criar logs de auditoria" ON departamento_audit_logs
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
