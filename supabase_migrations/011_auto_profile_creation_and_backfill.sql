-- =============================================
-- SCRIPT: Auto-criação de perfil e Backfill
-- Objetivo: Garantir que todo usuário auth.users tenha um perfil em profiles!
-- Execute este script no Editor SQL do Supabase!
-- =============================================

-- =============================================
-- 1. FUNÇÃO: Cria perfil automaticamente para novos usuários
-- =============================================
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'colaborador', -- role padrão
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Se já existir, não faz nada!

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. TRIGGER: Executa a função quando um novo usuário é criado no auth.users
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- =============================================
-- 3. BACKFILL: Cria perfis para usuários auth.users que NÃO tem perfil em profiles!
-- =============================================
INSERT INTO public.profiles (id, email, nome, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'nome',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1)
  ),
  'colaborador',
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. (Opcional) Verifica o resultado!
-- =============================================
SELECT 'Usuários em auth.users:' AS info, COUNT(*) AS count FROM auth.users
UNION ALL
SELECT 'Perfis em profiles:' AS info, COUNT(*) AS count FROM profiles;

-- =============================================
-- FIM DO SCRIPT!
-- =============================================
