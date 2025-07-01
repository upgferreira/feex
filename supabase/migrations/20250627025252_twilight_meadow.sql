/*
  # Create financial accounts table

  1. New Tables
    - `financial_accounts`
      - `id` (uuid, primary key)
      - `canal` (text)
      - `caixa` (text)
      - `fornecedor_nome_fantasia` (text)
      - `fornecedor_razao_social` (text)
      - `fornecedor_cnpj` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `financial_accounts` table
    - Add policy for all authenticated users to read accounts
*/

CREATE TABLE IF NOT EXISTS financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL,
  caixa text NOT NULL,
  fornecedor_nome_fantasia text,
  fornecedor_razao_social text,
  fornecedor_cnpj text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read accounts"
  ON financial_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify accounts"
  ON financial_accounts
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_accounts_canal ON financial_accounts(canal);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_caixa ON financial_accounts(caixa);

-- Insert the account mappings
INSERT INTO financial_accounts (canal, caixa, fornecedor_nome_fantasia, fornecedor_razao_social, fornecedor_cnpj) VALUES
('ALI EXPRESS', 'Marketplace | ALI EXPRESS', '', '', ''),
('AMAZON', 'Marketplace | AMAZON', 'AMAZON', 'AMAZON SERVIÇOS DE VAREJO DO BRASIL LTDA', '15.436.940/0001-03'),
('B2W', 'Marketplace | B2W', '', '', ''),
('CARREFOUR', 'Marketplace | CARREFOUR', '', '', ''),
('DAFITI', 'Marketplace | DAFITI', '', '', ''),
('MADEIRAMADEIRA', 'Marketplace | MADEIRAMADEIRA', '', '', ''),
('MAGAZINE LUIZA', 'Marketplace | MAGAZINE LUIZA', '', 'MAGALU PAGAMENTOS DIGITAIS LTDA', '53.260.945/0001-09'),
('MELHOR ENVIO', '', '', '', ''),
('MERCADO LIVRE', 'Banco | MERCADO PAGO | C/C', 'MERCADO LIVRE', 'EBAZAR.COM.BR. LTDA', '03.007.331/0001-41'),
('MERCADO PAGO', 'Banco | MERCADO PAGO | C/C', '', '', ''),
('NETSHOES', 'Marketplace | NETSHOES', '', '', ''),
('OLIST', 'Marketplace | OLIST', '', '', ''),
('PAGAR ME', '', '', '', ''),
('SHEIN', 'Marketplace | SHEIN', '', 'IN GLOW BRASIL INTERMEDIAÇÃO DE NEGÓCIOS LTDA', ''),
('SHOPEE', 'Marketplace | SHOPEE', 'SHOPEE', 'SHPS TECNOLOGIA E SERVICOS LTDA.', '35.635.824/0001-12'),
('TIK TOK SHOP', 'Marketplace | TIK TOK SHOP', '', '', ''),
('VIA VAREJO', 'Marketplace | VIA VAREJO', '', '', ''),
('VINDI', '', '', '', '');