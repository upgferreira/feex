/*
  # Fix admin user permissions

  1. Check if user exists in auth.users
  2. Update existing user profile to admin if user exists
  3. Create admin user instructions if user doesn't exist

  This migration safely handles the admin user setup without violating foreign key constraints.
*/

-- First, let's check if the user exists and update their profile if they do
DO $$
DECLARE
  user_exists boolean;
  profile_exists boolean;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = '2c06c506-27c4-4c32-5494-23f1b8e7c8e7'
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Check if profile exists
    SELECT EXISTS(
      SELECT 1 FROM user_profiles 
      WHERE user_id = '2c06c506-27c4-4c32-5494-23f1b8e7c8e7'
    ) INTO profile_exists;
    
    IF profile_exists THEN
      -- Update existing profile to admin
      UPDATE user_profiles 
      SET 
        is_admin = true,
        responsible_name = COALESCE(responsible_name, 'Administrador'),
        updated_at = now()
      WHERE user_id = '2c06c506-27c4-4c32-5494-23f1b8e7c8e7';
      
      RAISE NOTICE 'Updated existing user profile to admin';
    ELSE
      -- Create new profile for existing user
      INSERT INTO user_profiles (user_id, is_admin, responsible_name)
      VALUES ('2c06c506-27c4-4c32-5494-23f1b8e7c8e7', true, 'Administrador');
      
      RAISE NOTICE 'Created admin profile for existing user';
    END IF;
  ELSE
    RAISE NOTICE 'User with ID 2c06c506-27c4-4c32-5494-23f1b8e7c8e7 does not exist in auth.users table';
    RAISE NOTICE 'Please create the user first through the authentication system';
  END IF;
END $$;

-- Alternative: Update any existing user to admin based on email if the specific ID doesn't work
-- This is a fallback in case the user was created with a different ID
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to find user by email (admin@feex.com.br)
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
    
    RAISE NOTICE 'Set user with email admin@feex.com.br as admin (ID: %)', admin_user_id;
  ELSE
    RAISE NOTICE 'No user found with email admin@feex.com.br';
  END IF;
END $$;

-- Ensure we have at least one admin user
-- If no admin exists, this will help identify the issue
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE is_admin = true;
  
  IF admin_count = 0 THEN
    RAISE NOTICE 'No admin users found. Please create a user with email admin@feex.com.br first';
  ELSE
    RAISE NOTICE 'Found % admin user(s)', admin_count;
  END IF;
END $$;