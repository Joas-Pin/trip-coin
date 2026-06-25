-- MIGRAÇÃO 013: Adiciona coluna chave_acesso à tabela comprovantes
-- Execute este script no Editor SQL do Supabase

DO $$ BEGIN
    -- Adiciona a coluna chave_acesso se ela não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'chave_acesso'
    ) THEN
        ALTER TABLE comprovantes 
        ADD COLUMN chave_acesso TEXT;
        
        RAISE NOTICE 'Coluna chave_acesso adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna chave_acesso já existe na tabela comprovantes';
    END IF;
END $$;
