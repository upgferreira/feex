/*
  # Create exported files table

  1. New Tables
    - `exported_files`
      - `id` (uuid, primary key)
      - `canal` (text)
      - `erp` (text)
      - `ano` (text)
      - `competencia` (text)
      - `periodo_inicial` (text)
      - `periodo_final` (text)
      - `formatos` (text array)
      - `arquivo` (text)
      - `file_data` (jsonb)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `exported_files` table
    - Add policy for authenticated users to manage their own exports
*/

CREATE TABLE IF NOT EXISTS exported_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL,
  erp text NOT NULL,
  ano text NOT NULL,
  competencia text NOT NULL,
  periodo_inicial text NOT NULL,
  periodo_final text NOT NULL,
  formatos text[] NOT NULL DEFAULT '{}'::text[],
  arquivo text NOT NULL,
  file_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exported_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exports"
  ON exported_files
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exported_files_user_id ON exported_files(user_id);
CREATE INDEX IF NOT EXISTS idx_exported_files_canal ON exported_files(canal);
CREATE INDEX IF NOT EXISTS idx_exported_files_created_at ON exported_files(created_at);