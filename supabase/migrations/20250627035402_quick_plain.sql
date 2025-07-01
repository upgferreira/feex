/*
  # Create admin user and fix admin panel

  1. Create admin user function
  2. Fix RLS policies for admin operations
  3. Update admin functions
*/

-- Function to create admin user (call this manually with your admin email)
CREATE OR REPLACE FUNCTION create_admin_user(admin_email text)
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NOT NULL THEN
    -- Update or insert admin profile
    INSERT INTO user_profiles (user_id, is_admin, responsible_name)
    VALUES (admin_user_id, true, 'Administrador')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      is_admin = true,
      responsible_name = COALESCE(user_profiles.responsible_name, 'Administrador');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin user (replace with your actual admin email)
-- You need to create this user in Supabase Auth first
SELECT create_admin_user('admin@feex.com.br');

-- Fix RLS policies to allow admin operations
DROP POLICY IF EXISTS "Only admins can modify categories" ON financial_categories;
CREATE POLICY "Only admins can modify categories"
  ON financial_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can modify accounts" ON financial_accounts;
CREATE POLICY "Only admins can modify accounts"
  ON financial_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Policy for admins to view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin = true
    )
  );

-- Policy for admins to modify all user profiles
DROP POLICY IF EXISTS "Admins can modify all profiles" ON user_profiles;
CREATE POLICY "Admins can modify all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin = true
    )
  );