/*
  # Create imported files table

  1. New Tables
    - `imported_files`
      - `id` (uuid, primary key)
      - `canal` (text)
      - `tipo` (text)
      - `ano` (text)
      - `competencia` (text)
      - `periodo_inicial` (text)
      - `periodo_final` (text)
      - `arquivo` (text)
      - `original_name` (text)
      - `size` (bigint)
      - `data_upload` (timestamptz)
      - `data` (jsonb)
      - `columns` (text array)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `imported_files` table
    - Add policy for authenticated users to manage their own files
*/

CREATE TABLE IF NOT EXISTS imported_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL,
  tipo text NOT NULL,
  ano text NOT NULL,
  competencia text NOT NULL,
  periodo_inicial text NOT NULL,
  periodo_final text NOT NULL,
  arquivo text NOT NULL,
  original_name text NOT NULL,
  size bigint NOT NULL,
  data_upload timestamptz DEFAULT now(),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  columns text[] NOT NULL DEFAULT '{}'::text[],
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE imported_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own files"
  ON imported_files
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_imported_files_user_id ON imported_files(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_files_canal ON imported_files(canal);
CREATE INDEX IF NOT EXISTS idx_imported_files_data_upload ON imported_files(data_upload);