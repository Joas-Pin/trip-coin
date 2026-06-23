
-- MIGRAÇÃO 008: SEGURANÇA APROFUNDADA PARA STORAGE (BUCKET DE COMPROVANTES
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. REMOVER POLÍTICAS ANTIGAS (para evitar conflitos)
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can upload to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files in comprovantes" ON storage.objects;

-- =============================================
-- 2. ATUALIZAR BUCKET COMPROVANTES (mais seguro)
-- =============================================

UPDATE storage.buckets
SET 
    public = false, -- Não mais público!
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ]::text[]
WHERE id = 'comprovantes';

-- =============================================
-- 3. NOVAS POLÍTICAS RLS SEGURAS
-- =============================================

-- Política 1: Usuários autenticados podem fazer upload de comprovantes vinculados às suas viagens
CREATE POLICY "Comprovantes: Usuários podem upload em suas viagens"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'comprovantes'
    AND (
        -- Arquivo deve estar em uma pasta com o ID da viagem
        -- Formato esperado: viagens/{viagem_id}/...
        (storage.foldername(name))[1] = 'viagens'
        AND (storage.foldername(name))[2] IS NOT NULL
    )
);

-- Política 2: Usuários autenticados podem ver comprovantes de suas viagens
CREATE POLICY "Comprovantes: Usuários veem comprovantes de suas viagens"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'comprovantes'
    AND (
        -- Pode ver se é dono da viagem
        EXISTS (
            SELECT 1 FROM viagens
            WHERE viagens.id::text = (storage.foldername(name))[2]
              AND viagens.solicitante_id = auth.uid()
        )
        -- Ou é admin/gestor
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'gestor')
        )
    )
);

-- Política 3: Usuários autenticados podem deletar comprovantes de suas viagens
CREATE POLICY "Comprovantes: Usuários deletam comprovantes de suas viagens"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'comprovantes'
    AND (
        -- Dono da viagem OU admin
        auth.uid() IN (
            SELECT solicitante_id FROM viagens 
            WHERE viagens.id::text = (storage.foldername(name))[2]
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
);

-- =============================================
-- 4. FUNÇÕES AUXILIARES PARA STORAGE
-- =============================================

-- Função para gerar caminho seguro de arquivo
CREATE OR REPLACE FUNCTION public.generate_safe_comprovante_path(
    p_viagem_id UUID,
    p_arquivo_nome TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN 'viagens/' || p_viagem_id::text || '/' || 
           regexp_replace(p_arquivo_nome, '[^a-zA-Z0-9._-]', '_', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

