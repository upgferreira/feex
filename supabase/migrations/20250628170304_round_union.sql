/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Current policies use `is_user_admin()` function that queries user_profiles table
    - This creates infinite recursion when the policy evaluates itself
    
  2. Solution
    - Replace complex admin check policies with simpler ones
    - Use direct user_id comparison for basic access
    - Create separate admin-only policies that don't cause recursion
    
  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies
    - Ensure users can read their own profiles without recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON user_profiles;

-- Create simple policy for users to read their own profile
CREATE POLICY "users_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create simple policy for users to update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create admin-only policies that don't cause recursion
-- Admin can read all profiles (but only if they have admin email)
CREATE POLICY "admin_can_read_all_profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@feex.com.br'
  );

-- Admin can update all profiles (but only if they have admin email)
CREATE POLICY "admin_can_update_all_profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@feex.com.br'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@feex.com.br'
  );