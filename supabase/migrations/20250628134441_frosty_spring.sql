/*
  # Fix RLS policies for categories and accounts

  1. Changes
    - Update policies to allow all authenticated users to read categories and accounts
    - Keep admin-only policies for modifications (INSERT, UPDATE, DELETE)

  2. Security
    - All authenticated users can read (SELECT) categories and accounts
    - Only admins can modify (INSERT, UPDATE, DELETE) categories and accounts
*/

-- Fix financial_categories policies
DROP POLICY IF EXISTS "All authenticated users can read categories" ON financial_categories;
DROP POLICY IF EXISTS "Only admins can modify categories" ON financial_categories;

-- Allow all authenticated users to read categories
CREATE POLICY "All authenticated users can read categories"
  ON financial_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify categories
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

-- Fix financial_accounts policies
DROP POLICY IF EXISTS "All authenticated users can read accounts" ON financial_accounts;
DROP POLICY IF EXISTS "Only admins can modify accounts" ON financial_accounts;

-- Allow all authenticated users to read accounts
CREATE POLICY "All authenticated users can read accounts"
  ON financial_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify accounts
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