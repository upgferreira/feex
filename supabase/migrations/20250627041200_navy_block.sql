/*
  # Fix admin user configuration

  1. Updates
    - Find the user by email and set as admin
    - Create profile if it doesn't exist
    - Ensure admin permissions are properly set

  2. Security
    - Verify admin user exists and has correct permissions
*/

-- First, let's find and update the admin user by email
DO $$
DECLARE
  admin_user_id uuid;
  profile_exists boolean;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users 
  WHERE email = 'admin@feex.com.br'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if profile exists
    SELECT EXISTS(
      SELECT 1 FROM user_profiles 
      WHERE user_id = admin_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
      -- Update existing profile to admin
      UPDATE user_profiles 
      SET 
        is_admin = true,
        responsible_name = COALESCE(responsible_name, 'Administrador'),
        updated_at = now()
      WHERE user_id = admin_user_id;
      
      RAISE NOTICE 'Updated existing user profile to admin for user: %', admin_user_id;
    ELSE
      -- Create new profile for existing user
      INSERT INTO user_profiles (user_id, is_admin, responsible_name, cnpj)
      VALUES (admin_user_id, true, 'Administrador', '00.000.000/0001-00');
      
      RAISE NOTICE 'Created admin profile for user: %', admin_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'No user found with email admin@feex.com.br';
    RAISE NOTICE 'Please ensure the user is created in Supabase Auth first';
  END IF;
END $$;

-- Verify admin user configuration
DO $$
DECLARE
  admin_count integer;
  admin_user_record record;
BEGIN
  -- Count admin users
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE is_admin = true;
  
  IF admin_count > 0 THEN
    RAISE NOTICE 'Found % admin user(s)', admin_count;
    
    -- Show admin user details
    FOR admin_user_record IN 
      SELECT up.user_id, up.responsible_name, au.email
      FROM user_profiles up
      JOIN auth.users au ON up.user_id = au.id
      WHERE up.is_admin = true
    LOOP
      RAISE NOTICE 'Admin user: % (%) - %', admin_user_record.responsible_name, admin_user_record.email, admin_user_record.user_id;
    END LOOP;
  ELSE
    RAISE NOTICE 'No admin users found after migration';
  END IF;
END $$;

-- Ensure RLS policies are correct for admin operations
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