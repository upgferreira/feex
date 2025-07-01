/*
  # Create financial categories table

  1. New Tables
    - `financial_categories`
      - `id` (uuid, primary key)
      - `canal` (text)
      - `grupo` (text)
      - `categoria_canal` (text)
      - `categoria_pai_erp` (text)
      - `categoria_erp` (text)
      - `tipo` (text)
      - `descontado` (text)
      - `nfe` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `financial_categories` table
    - Add policy for all authenticated users to read categories
*/

CREATE TABLE IF NOT EXISTS financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL,
  grupo text,
  categoria_canal text NOT NULL,
  categoria_pai_erp text NOT NULL,
  categoria_erp text NOT NULL,
  tipo text,
  descontado text,
  nfe text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read categories"
  ON financial_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify categories"
  ON financial_categories
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_categories_canal ON financial_categories(canal);
CREATE INDEX IF NOT EXISTS idx_financial_categories_categoria_canal ON financial_categories(categoria_canal);

-- Insert the category mappings
INSERT INTO financial_categories (canal, grupo, categoria_canal, categoria_pai_erp, categoria_erp, tipo, descontado, nfe) VALUES
('AMAZON', '', 'Cadastro', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('AMAZON', '', 'Cobranças do Delivery by Amazon', 'Despesas comerciais', 'Fretes sobre vendas', 'Despesas', '', ''),
('AMAZON', '', 'créditos de embalagem de presente', 'Outras receitas', 'Outras receitas', 'Despesas', '', ''),
('AMAZON', '', 'créditos de remessa', 'Despesas comerciais', 'Fretes de vendas', 'Despesas', '', ''),
('AMAZON', '', 'Custo de Publicidade', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', '', ''),
('AMAZON', '', 'descontos promocionais', 'Deduções sobre vendas', 'Descontos', 'Despesas', '', ''),
('AMAZON', '', 'Estorno do frete pago pelo comprador', 'Outras receitas', 'Estornos de despesas', 'Despesas', '', ''),
('AMAZON', '', 'imposto de vendas coletados', 'Despesas administrativas', 'Outras despesas', 'Despesas', '', ''),
('AMAZON', '', 'outro', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('AMAZON', '', 'Outros', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('AMAZON', '', 'Reembolso', 'Outras receitas', 'Estornos de despesas', 'Despesas', '', ''),
('AMAZON', '', 'Tarifa de manuseio com base no peso Delivery by Amazon', 'Despesas comerciais', 'Fretes sobre vendas', 'Despesas', '', ''),
('AMAZON', '', 'Tarifas de serviço', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('AMAZON', '', 'tarifas de venda', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('AMAZON', '', 'taxas de outras transações', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('AMAZON', '', 'taxas fba', 'Despesas comerciais', 'Fretes sobre vendas', 'Despesas', '', ''),
('MAGAZINE LUIZA', '*Financeiro', 'Juros', 'Deduções sobre vendas', 'Taxas sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Financeiro', 'Taxa de antecipação', 'Deduções sobre vendas', 'Taxas sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Fixo', 'Tarifa fixa por pacote', 'Deduções sobre vendas', 'Custos sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Fixo', 'Tarifa fixa por pedido', 'Deduções sobre vendas', 'Custos sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Logistica', 'Coparticipação de frete', 'Deduções sobre vendas', 'Fretes sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Fixo', 'Coparticipação de Fretes estimada', 'Deduções sobre vendas', 'Fretes sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Logistica', 'Custos logísticos', 'Deduções sobre vendas', 'Fretes sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Taxas', 'Intermediações financeiras (MDR)', 'Deduções sobre vendas', 'Taxas sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Taxas', 'Serviços de intermediação', 'Deduções sobre vendas', 'Taxas sobre vendas', '', '', ''),
('MAGAZINE LUIZA', '*Taxas', 'Serviços de tecnologia', 'Deduções sobre vendas', 'Taxas sobre vendas', '', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa de devolução por envio externo ou intermunicipal', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa de manutenção da Minha página', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa de venda', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', 'NF-e Tarifa de venda'),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa por campanhas de publicidade - Product Ads', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', 'NF-e Ads'),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa por devolução', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa por envio interno ao município', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', 'NF-e Tarifa por envio interno ao município'),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa por serviço de armazenamento Full', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Cancelamento da tarifa por serviço de coleta Full', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Estorno da tarifa de manutenção do eShop', 'Outras receitas', 'Estornos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Estorno da tarifa de venda', 'Outras receitas', 'Estornos de despesas', 'Receitas', 'Não se aplica', 'NF-e Tarifa de venda'),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Estorno do custo de envio externo ou inter municipal', 'Outras receitas', 'Estornos de despesas', 'Receitas', 'Não se aplica', ''),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Estorno do custo de gestão da venda', 'Outras receitas', 'Estornos de despesas', 'Receitas', 'Não se aplica', 'NF-e Custo de gestão da venda'),
('MERCADO LIVRE', 'Cancelamentos de tarifas', 'Estorno do custo de Mercado Envios', 'Outras receitas', 'Estornos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa de devolução', 'Despesas comerciais', 'Fretes de devoluções', 'Despesas', '', 'NF-e Tarifa de devolução'),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa de devolução por envio externo ou intermunicipal', 'Despesas comerciais', 'Fretes de devoluções', 'Despesas', '', 'NF-e não aplicável'),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa de devolução por envio interno no município', 'Despesas comerciais', 'Fretes de devoluções', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa de envio extra ou intermunicipal', 'Despesas comerciais', 'Fretes sobre vendas', 'Despesas', 'Sim', 'NF-e não aplicável'),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa de envio interno à cidade', 'Despesas comerciais', 'Fretes de vendas', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa do Mercado Envios', 'Despesas comerciais', 'Fretes sobre vendas', 'Despesas', '', 'NF-e não aplicável'),
('MERCADO LIVRE', 'Tarifa do Mercado Envios', 'Tarifa por envio interno ao município', 'Despesas comerciais', 'Fretes de vendas', 'Despesas', 'Sim', 'NF-e Tarifa por envio interno ao município'),
('MERCADO LIVRE', 'Tarifas da Minha página', 'Tarifa de manutenção da Minha página', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', 'Não', ''),
('MERCADO LIVRE', 'Tarifas de venda', 'Custo de gestão da venda', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', 'Não se aplica', 'NF-e Custo de gestão da venda'),
('MERCADO LIVRE', 'Tarifas de venda', 'Custo por inconformidade no Envios Full', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas de venda', 'Tarifa de venda', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', 'Não se aplica', 'NF-e Tarifa de venda'),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Cancelamento do custo por inconformidade no Envios Full', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'CANCELAMENTO DA TARIFA DE ENVIO EXTRA OU INTERMUNICIPAL', 'Outras receitas', 'Cancelamentos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Custo de armazenamento prolongado no Full', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Custo do serviço de coleta Full', 'Despesas comerciais', 'Fretes de coletas', 'Despesas', 'Não', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Custo por retirada de estoque Full', 'Despesas comerciais', 'Fretes de coletas', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Custo por retirada ou descarte de estoque Full', 'Despesas comerciais', 'Fretes de coletas', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Estorno pelo serviço de coleta Full', 'Outras receitas', 'Estornos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Estorno por retirada de estoque no Full', 'Outras receitas', 'Estornos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Tarifa pelo serviço de armazenamento', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Tarifa pelo serviço de armazenamento Full', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', 'Não', 'NF-e Full'),
('MERCADO LIVRE', 'Tarifas do Mercado Envios Full', 'Tarifa por estoque antigo no Full', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', 'Não', ''),
('MERCADO LIVRE', 'Tarifas dos serviços do Mercado Pago', 'Tarifas dos serviços do Mercado Pago', 'Despesas Financeira', '$Outras despesas financeiras', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Anulação da tarifa por campanhas de publicidade - Brand Ads', 'Outras receitas', 'Estornos de despesas', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'BONIFICACIÓN CAMPAÑAS DE PUBLICIDAD - DISPLAY PROGRAMÁTICO', 'Receitas comerciais', 'Propaganda e publicidade', 'Receitas', '', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Bonificação campanhas de publicidade - Product Ads', 'Receitas comerciais', 'Propaganda e publicidade', 'Receitas', '', 'NF-e Ads'),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Campañas de publicidad - Brand Ads', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Campañas de publicidad - Display programático', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', 'Não', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Campañas de publicidad - Display Ads', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', '', ''),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Campanhas de publicidade - Product Ads', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', '', 'NF-e Ads'),
('MERCADO LIVRE', 'Tarifas por campanha de publicidade', 'Tarifa por campanha de publicidade no Google Ads pelo Mercado Shops', 'Despesas comerciais', 'Propaganda e publicidade', 'Despesas', '', 'NF-e Ads'),
('MERCADO LIVRE', 'Taxas de parcelamento', 'Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', 'Não', ''),
('MERCADO LIVRE', 'Taxas de parcelamento', 'Taxas de parcelamento', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('MERCADO LIVRE', '', 'Cancelamento da Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)', 'Outras receitas', 'Estornos de despesas', 'Receitas', 'Não se aplica', ''),
('MERCADO LIVRE', '', 'Tarifa de manutenção do eShop', 'Despesas administrativas', 'Serviços de terceiros', 'Despesas', '', ''),
('SHEIN', '', 'Taxas Shein', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('SHOPEE', '', 'Taxa de envio pagas pelo comprador', 'Receitas comerciais', 'Fretes de vendas', 'Receitas', '', ''),
('SHOPEE', '', 'Desconto de Frete Aproximado', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('SHOPEE', '', 'Taxa de comissão', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('SHOPEE', '', 'Taxa de Envio Reversa', 'Despesas comerciais', 'Fretes de devoluções', 'Despesas', '', ''),
('SHOPEE', '', 'Taxa de serviço', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', ''),
('SHOPEE', '', 'Taxa de transação', 'Deduções sobre vendas', 'Taxas sobre vendas', 'Despesas', '', '');