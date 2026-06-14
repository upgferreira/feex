import { supabase } from '../lib/supabase';

// ── Shared types ──────────────────────────────────────────────────────────────
export interface BlingRow {
  ID: string;
  Data: string;
  Competencia: string;
  'Cliente/Fornecedor': string;
  Observacoes: string;
  Valor: string;
  Categoria: string;
  Portador: string;
  Saldo: string;
  CNPJ: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function normalizeText(text: string) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9\s]/g, ' ')  // remove special chars including 'do', punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function convertExcelDate(serialDate: number): string {
  if (!serialDate || isNaN(serialDate)) return '';
  const d = new Date(new Date(1900, 0, 1).getTime() + (serialDate - 1) * 86400000);
  if (serialDate > 59) d.setTime(d.getTime() - 86400000);
  return d.toLocaleDateString('pt-BR');
}

export function cleanText(text: string) {
  return text ? text.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

export function formatDateToBR(dateString: string): string {
  const serial = Number(dateString);
  if (!isNaN(serial) && serial > 1 && serial < 100000) return convertExcelDate(serial);
  if (dateString.includes('/')) return dateString;
  if (dateString.includes('-')) {
    const [y, m, d] = dateString.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateString;
}

export function formatValueToBR(value: number) {
  return value.toFixed(2).replace('.', ',');
}

export function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const d = new Date(new Date(1900, 0, 1).getTime() + (val - 1) * 86400000);
    if (val > 59) d.setTime(d.getTime() - 86400000);
    return d;
  }
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const [d, m, y] = val.split('/');
      return new Date(+y, +m - 1, +d);
    }
    return new Date(val);
  }
  return null;
}

export function toDateStr(val: any): string {
  const d = toDate(val);
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '';
}

// ── ML → Bling ────────────────────────────────────────────────────────────────
export function convertMLToBling(
  data: any[],
  dataInicial: string,
  dataFinal: string,
  competencia: string,
  categories: any[],
  accounts: any[]
): BlingRow[] {
  if (!data?.length) return [];

  const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'MERCADO LIVRE');
  const clienteFornecedor = conta?.fornecedor_razao_social || conta?.fornecedor_nome_fantasia || 'EBAZAR.COM.BR. LTDA';
  const portador          = conta?.caixa                  || 'Banco | MERCADO PAGO | C/C';
  const cnpj              = conta?.fornecedor_cnpj        || '03.007.331/0001-41';

  const dataInicialObj = new Date(dataInicial + 'T00:00:00');
  const dataFinalObj   = new Date(dataFinal   + 'T23:59:59');

  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    // Find all matches for this channel+category
    const matches = categories.filter(c => {
      const ch = String(c.channel || c.canal || '').toUpperCase().trim();
      if (ch !== 'MERCADO LIVRE') return false;
      const key = normalizeText(c.channel_category || c.categoria_canal || '');
      return key === norm;
    });
    // Prefer the one with erp_category filled
    const withCat = matches.find(c => !!(c.erp_category || c.categoria_erp));
    const match = withCat || matches[0];
    return match?.erp_category || match?.categoria_erp || '';
  };

  const resultado: BlingRow[] = [];

  data.forEach((row, index) => {
    try {
      const dataTarifa  = row['Data da tarifa'];
      const detalhe     = String(row['Detalhe']         || '');
      const valorTarifa = row['Valor da tarifa'];
      const numVendaML  = String(row['Número da venda'] || '');
      const cliente     = String(row['Cliente']         || '');

      if (!dataTarifa || !detalhe || valorTarifa == null) return;

      const dataLinha = toDate(dataTarifa);
      if (!dataLinha || isNaN(dataLinha.getTime())) return;
      if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;

      const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
      // Debug first 3 rows
      if (resultado.length < 3) {
        console.log('ML row date debug:', { dataTarifa, typeOf: typeof dataTarifa, dataLinha: dataLinha.toISOString(), dataFormatada, month: dataLinha.getMonth()+1, year: dataLinha.getFullYear() });
      }
      const categoria = findCat(detalhe);
      const pedido = numVendaML ? `XXXXXX/${numVendaML}` : '';

      const parte1 = cliente ? `MERCADO LIVRE: ${cliente.toUpperCase()}` : 'MERCADO LIVRE';
      const parte2 = pedido
        ? [`PEDIDO DE VENDA: ${pedido}`, 'NF: XX/XXXXXX', detalhe.toUpperCase()].join(' > ')
        : detalhe.toUpperCase();
      const lineCompetencia = `${String(dataLinha.getMonth() + 1).padStart(2,'0')}/${dataLinha.getFullYear()}`;
      const obs = cleanText([parte1, parte2, categoria.toUpperCase(), dataFormatada, lineCompetencia].filter(Boolean).join(' | '));

      resultado.push({
        'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada,
        'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs,
        'Valor': formatValueToBR(Number(valorTarifa) * -1),
        'Categoria': categoria, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj,
      });
    } catch (e) { console.error(`ML linha ${index}:`, e); }
  });

  return resultado;
}

// ── Nuvem Pago → Bling ───────────────────────────────────────────────────────
export function convertNuvemPagoToBling(
  data: any[],
  dataInicial: string,
  dataFinal: string,
  competencia: string,
  categories: any[],
  accounts: any[]
): BlingRow[] {
  if (!data?.length) return [];

  const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'NUVEM PAGO');
  const clienteFornecedor = conta?.fornecedor_razao_social || conta?.fornecedor_nome_fantasia || 'NUVEM PAGO';
  const portador          = conta?.caixa                  || '';
  const cnpj              = conta?.fornecedor_cnpj        || '';

  const catRow = categories.find(c =>
    String(c.channel || c.canal || '').toUpperCase().trim() === 'NUVEM PAGO' &&
    String(c.channel_category || c.categoria_canal || '').toUpperCase().trim() === 'TAXAS'
  );
  const categoriaERP = catRow?.erp_category || catRow?.categoria_erp || '';
  const categoriaPai = catRow?.erp_parent_category || catRow?.categoria_pai_erp || '';

  const dataInicialObj = new Date(dataInicial + 'T00:00:00');
  const dataFinalObj   = new Date(dataFinal   + 'T23:59:59');

  const pedidos: Record<string, any> = {};

  const parseV = (v: any) => {
    if (!v) return 0;
    const s = String(v).trim();
    return s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s) || 0;
  };

  data.forEach(row => {
    const pedidoRaw = row['Número do Pedido'];
    if (!pedidoRaw) return;
    const numeroPedido  = String(Math.round(Number(pedidoRaw)));
    const comprador     = String(row['Nome do comprador'] || '').trim();
    const dataPagamento = row['Data de pagamento'];
    const taxa  = parseV(row['Taxas']);
    const juros = parseV(row['Juros']);
    if (!dataPagamento) return;

    const dataLinha = toDate(dataPagamento);
    if (!dataLinha || isNaN(dataLinha.getTime())) return;
    if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;

    if (!pedidos[numeroPedido]) {
      pedidos[numeroPedido] = { pedido: numeroPedido, comprador, dataPagamento: dataLinha, valor: 0, juros: 0 };
    }
    pedidos[numeroPedido].valor += (taxa + juros) * -1;
    pedidos[numeroPedido].juros += juros;
  });

  return Object.values(pedidos).map((item: any) => {
    const dataFormatada = item.dataPagamento.toLocaleDateString('pt-BR');
    const catCompleta = categoriaPai && categoriaERP
      ? `${categoriaPai.toUpperCase()} > ${categoriaERP.toUpperCase()}`
      : categoriaERP.toUpperCase();
    const dataFormatadaItem = item.dataPagamento.toLocaleDateString('pt-BR');
    const lineCompetencia = `${String(item.dataPagamento.getMonth() + 1).padStart(2,'0')}/${item.dataPagamento.getFullYear()}`;
    const obs = cleanText([
      `NUVEM PAGO: ${item.comprador.toUpperCase()}`,
      [`PEDIDO DE VENDA: XXXXXX/${item.pedido}`, 'NF: XX/XXXXXX', item.juros > 0 ? 'TAXA + JUROS' : 'TAXA'].join(' > '),
      catCompleta,
      dataFormatadaItem,
      lineCompetencia,
    ].filter(Boolean).join(' | '));

    return {
      'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada,
      'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs,
      'Valor': formatValueToBR(item.valor),
      'Categoria': categoriaERP, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj,
    };
  });
}

// ── Generic converter ─────────────────────────────────────────────────────────
export function convertToBling(
  canal: string,
  data: any[],
  dataInicial: string,
  dataFinal: string,
  competencia: string,
  categories: any[],
  accounts: any[]
): BlingRow[] {
  if (canal === 'MERCADO LIVRE') return convertMLToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'NUVEM PAGO')   return convertNuvemPagoToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  return [];
}
