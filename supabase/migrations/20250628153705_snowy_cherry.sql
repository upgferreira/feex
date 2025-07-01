/*
  # Renomear coluna grupo para grupo_canal

  1. Alterações
    - Renomear coluna 'grupo' para 'grupo_canal' na tabela financial_categories
    - Atualizar dados existentes se necessário

  2. Segurança
    - Manter todas as políticas RLS existentes
*/

-- Renomear a coluna grupo para grupo_canal
ALTER TABLE financial_categories 
RENAME COLUMN grupo TO grupo_canal;

-- Atualizar os dados existentes para ter valores mais descritivos no grupo_canal
UPDATE financial_categories 
SET grupo_canal = CASE 
  WHEN grupo_canal = '' OR grupo_canal IS NULL THEN 'Geral'
  WHEN grupo_canal = '*Financeiro' THEN 'Financeiro'
  WHEN grupo_canal = '*Fixo' THEN 'Fixo'
  WHEN grupo_canal = '*Logistica' THEN 'Logística'
  WHEN grupo_canal = '*Taxas' THEN 'Taxas'
  WHEN grupo_canal = 'Cancelamentos de tarifas' THEN 'Cancelamentos de Tarifas'
  WHEN grupo_canal = 'Tarifa do Mercado Envios' THEN 'Tarifa do Mercado Envios'
  WHEN grupo_canal = 'Tarifas da Minha página' THEN 'Tarifas da Minha Página'
  WHEN grupo_canal = 'Tarifas de venda' THEN 'Tarifas de Venda'
  WHEN grupo_canal = 'Tarifas do Mercado Envios Full' THEN 'Tarifas do Mercado Envios Full'
  WHEN grupo_canal = 'Tarifas dos serviços do Mercado Pago' THEN 'Tarifas dos Serviços do Mercado Pago'
  WHEN grupo_canal = 'Tarifas por campanha de publicidade' THEN 'Tarifas por Campanha de Publicidade'
  WHEN grupo_canal = 'Taxas de parcelamento' THEN 'Taxas de Parcelamento'
  ELSE grupo_canal
END;