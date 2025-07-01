/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Drop problematic recursive policies
    - Create simple, non-recursive policies
    - Fix admin function without using auth schema
    - Ensure proper access control

  2. Security
    - All authenticated users can read categories and accounts
    - Only admins can modify categories and accounts
    - Users can manage their own profiles, admins can manage all
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "All authenticated users can read categories" ON financial_categories;
DROP POLICY IF EXISTS "Only admins can modify categories" ON financial_categories;
DROP POLICY IF EXISTS "All authenticated users can read accounts" ON financial_accounts;
DROP POLICY IF EXISTS "Only admins can modify accounts" ON financial_accounts;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can modify all profiles" ON user_profiles;

-- Drop the problematic is_admin function
DROP FUNCTION IF EXISTS is_admin();

-- Create a simple admin check function in public schema
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple policies for financial_categories
CREATE POLICY "categories_select_all"
  ON financial_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "categories_insert_admin"
  ON financial_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "categories_update_admin"
  ON financial_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "categories_delete_admin"
  ON financial_categories
  FOR DELETE
  TO authenticated
  USING (public.is_user_admin());

-- Simple policies for financial_accounts
CREATE POLICY "accounts_select_all"
  ON financial_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "accounts_insert_admin"
  ON financial_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "accounts_update_admin"
  ON financial_accounts
  FOR UPDATE
  TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "accounts_delete_admin"
  ON financial_accounts
  FOR DELETE
  TO authenticated
  USING (public.is_user_admin());

-- Simple policies for user_profiles (avoid recursion by using direct queries)
CREATE POLICY "profiles_select_own_or_admin"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles admin_check 
      WHERE admin_check.user_id = auth.uid() AND admin_check.is_admin = true
    )
  );

CREATE POLICY "profiles_update_own_or_admin"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles admin_check 
      WHERE admin_check.user_id = auth.uid() AND admin_check.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles admin_check 
      WHERE admin_check.user_id = auth.uid() AND admin_check.is_admin = true
    )
  );

-- Ensure we have an admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users 
  WHERE email = 'admin@feex.com.br'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Update or create profile for this user
    INSERT INTO user_profiles (user_id, is_admin, responsible_name, cnpj)
    VALUES (admin_user_id, true, 'Administrador', '00.000.000/0001-00')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      is_admin = true,
      responsible_name = 'Administrador',
      updated_at = now();
    
    RAISE NOTICE 'Admin user configured successfully';
  ELSE
    RAISE NOTICE 'Admin user not found - please create user with email admin@feex.com.br';
  END IF;
END $$;