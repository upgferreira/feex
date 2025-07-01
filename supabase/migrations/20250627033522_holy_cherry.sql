/*
  # Sistema de Administração

  1. Alterações na tabela user_profiles
    - Adicionar campo is_admin (boolean)
    - Adicionar campo subscription_status (text)
    - Adicionar campo subscription_expires_at (timestamptz)

  2. Políticas de segurança
    - Permitir que admins vejam todos os perfis
    - Permitir que admins modifiquem categorias e caixas

  3. Função para verificar se usuário é admin
*/

-- Adicionar campos de admin e assinatura à tabela user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas para categorias financeiras
DROP POLICY IF EXISTS "Only admins can modify categories" ON financial_categories;
CREATE POLICY "Only admins can modify categories"
  ON financial_categories
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Atualizar políticas para contas financeiras
DROP POLICY IF EXISTS "Only admins can modify accounts" ON financial_accounts;
CREATE POLICY "Only admins can modify accounts"
  ON financial_accounts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Política para admins verem todos os perfis de usuário
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Política para admins modificarem perfis de usuário
CREATE POLICY "Admins can modify all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Criar um usuário admin padrão (você pode alterar o email)
-- Nota: Este usuário precisa ser criado manualmente no Supabase Auth primeiro
-- INSERT INTO user_profiles (user_id, is_admin, responsible_name)
-- SELECT id, true, 'Administrador'
-- FROM auth.users
-- WHERE email = 'admin@feex.com.br'
-- ON CONFLICT (user_id) DO UPDATE SET is_admin = true;