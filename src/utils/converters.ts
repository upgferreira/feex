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

export interface OlistRow {
  Data: string;
  Categoria: string;
  Historico: string;
  Tipo: string;
  Valor: string;
  ID: string;
  Contato: string;
  CNPJ: string;
  Marcadores: string;
  'Conta de destino': string;
  'Nr documento': string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function normalizeText(text: string) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
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
    return d.padStart(2,'0') + '/' + m.padStart(2,'0') + '/' + y;
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

const parseDateBR = toDate;

export function toDateStr(val: any): string {
  const d = toDate(val);
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '';
}

// ── Olist tipo/valor helper: Olist usa coluna Tipo (C/D) e Valor sempre positivo ──
function olistTipoValor(valor: number): { Tipo: string; Valor: string } {
  return { Tipo: valor < 0 ? 'D' : 'C', Valor: String(Math.abs(valor)) };
}

// ── Olist obs helper ──────────────────────────────────────────────────────────
function buildOlistObs(canal: string, detalhe: string, pedido: string, cliente: string, categoria: string, competencia: string): string {
  return [
    canal.toUpperCase(),
    [detalhe, pedido, cliente].filter(Boolean).join(' > ').toUpperCase(),
    categoria.toUpperCase(),
    competencia.toUpperCase(),
  ].filter(Boolean).join(' | ');
}

// ── ML → Bling ────────────────────────────────────────────────────────────────
export function convertMLToBling(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  if (!data?.length) return [];
  const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'MERCADO LIVRE');
  const clienteFornecedor = conta?.fornecedor_razao_social || conta?.fornecedor_nome_fantasia || 'EBAZAR.COM.BR. LTDA';
  const portador = conta?.caixa || 'Banco | MERCADO PAGO | C/C';
  const cnpj = conta?.fornecedor_cnpj || '03.007.331/0001-41';
  const dataInicialObj = new Date(dataInicial + 'T00:00:00');
  const dataFinalObj = new Date(dataFinal + 'T23:59:59');

  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    let matches = categories.filter(c => {
      const ch = String(c.channel || c.canal || '').toUpperCase().trim();
      if (ch !== 'MERCADO LIVRE') return false;
      return normalizeText(c.channel_category || c.categoria_canal || '') === norm;
    });
    if (!matches.length) {
      matches = categories.filter(c => {
        const ch = String(c.channel || c.canal || '').toUpperCase().trim();
        if (ch !== 'MERCADO LIVRE') return false;
        const key = normalizeText(c.channel_category || c.categoria_canal || '');
        return key && norm && (key.includes(norm) || norm.includes(key));
      });
    }
    const match = matches.find(c => !!(c.erp_category || c.categoria_erp)) || matches[0];
    return { cat: match?.erp_category || match?.categoria_erp || '', pai: match?.erp_parent_category || match?.categoria_pai_erp || '' };
  };

  const resultado: BlingRow[] = [];
  data.forEach((row, index) => {
    try {
      const dataTarifa = row['Data da tarifa'];
      const detalhe = String(row['Detalhe'] || '');
      const valorTarifa = row['Valor da tarifa'];
      const numVendaML = String(row['Número da venda'] || '');
      const cliente = String(row['Cliente'] || '');
      if (!dataTarifa || !detalhe || valorTarifa == null) return;
      const dataLinha = toDate(dataTarifa);
      if (!dataLinha || isNaN(dataLinha.getTime())) return;
      if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;
      const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
      const { cat: categoria, pai: categoriaPai } = findCat(detalhe);
      const catDisplay = categoriaPai && categoria ? categoriaPai.toUpperCase() + ' > ' + categoria.toUpperCase() : categoria.toUpperCase();
      const pedido = numVendaML ? 'XXXXXX/' + numVendaML : '';
      const parte1 = cliente ? 'MERCADO LIVRE: ' + cliente.toUpperCase() : 'MERCADO LIVRE';
      const parte2 = pedido ? 'PEDIDO DE VENDA: ' + pedido + ' > NF: XX/XXXXXX > ' + detalhe.toUpperCase() : detalhe.toUpperCase();
      const lineCompetencia = String(dataLinha.getMonth() + 1).padStart(2,'0') + '/' + dataLinha.getFullYear();
      const obs = cleanText([parte1, parte2, catDisplay, dataFormatada, lineCompetencia].filter(Boolean).join(' | '));
      resultado.push({ 'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada, 'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs, 'Valor': formatValueToBR(Number(valorTarifa) * -1), 'Categoria': categoria, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj });
    } catch (e) { console.error('ML linha ' + index + ':', e); }
  });
  return resultado;
}

// ── ML → Olist ────────────────────────────────────────────────────────────────
function convertMLToOlist(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): OlistRow[] {
  if (!data?.length) return [];
  const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'MERCADO LIVRE');
  const portador = conta?.caixa || '';
  const fornecedor = conta?.fornecedor_razao_social || 'MERCADO LIVRE';
  const cnpj = conta?.fornecedor_cnpj || '';
  const dataInicialObj = new Date(dataInicial + 'T00:00:00');
  const dataFinalObj = new Date(dataFinal + 'T23:59:59');
  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    const matches = categories.filter(c => String(c.channel || c.canal || '').toUpperCase().trim() === 'MERCADO LIVRE' && normalizeText(c.channel_category || c.categoria_canal || '') === norm);
    const match = matches.find(c => !!(c.erp_category || c.categoria_erp)) || matches[0];
    return match?.erp_category || match?.categoria_erp || '';
  };
  const resultado: OlistRow[] = [];
  data.forEach((row: any) => {
    const dataTarifa = row['Data da tarifa'];
    const detalhe = String(row['Detalhe'] || '');
    const valorTarifa = row['Valor da tarifa'];
    const pedido = String(row['Número da venda'] || '');
    const cliente = String(row['Cliente'] || '');
    if (!dataTarifa || !detalhe || valorTarifa == null) return;
    const dataLinha = toDate(dataTarifa);
    if (!dataLinha || isNaN(dataLinha.getTime())) return;
    if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;
    const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
    const lineCompetencia = String(dataLinha.getMonth() + 1).padStart(2,'0') + '/' + dataLinha.getFullYear();
    const cat = findCat(detalhe);
    const obs = buildOlistObs('MERCADO LIVRE', detalhe, pedido, cliente, cat, lineCompetencia);
    resultado.push({ Data: dataFormatada, Categoria: cat, Historico: obs, ...olistTipoValor(Number(valorTarifa) * -1), ID: '', Contato: fornecedor, CNPJ: cnpj, Marcadores: '', 'Conta de destino': portador, 'Nr documento': '' });
  });
  return resultado;
}

// ── Nuvem Pago → Bling ───────────────────────────────────────────────────────
export function convertNuvemPagoToBling(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  if (!data?.length) return [];
  const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'NUVEM PAGO');
  const clienteFornecedor = conta?.fornecedor_razao_social || conta?.fornecedor_nome_fantasia || 'NUVEM PAGO';
  const portador = conta?.caixa || '';
  const cnpj = conta?.fornecedor_cnpj || '';
  const catRow = categories.find(c => String(c.channel || c.canal || '').toUpperCase().trim() === 'NUVEM PAGO' && String(c.channel_category || c.categoria_canal || '').toUpperCase().trim() === 'TAXAS');
  const categoriaERP = catRow?.erp_category || catRow?.categoria_erp || '';
  const categoriaPai = catRow?.erp_parent_category || catRow?.categoria_pai_erp || '';
  const dataInicialObj = new Date(dataInicial + 'T00:00:00');
  const dataFinalObj = new Date(dataFinal + 'T23:59:59');
  const pedidos: Record<string, any> = {};
  const parseV = (v: any) => { if (!v) return 0; const s = String(v).trim(); return s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s) || 0; };
  data.forEach(row => {
    const pedidoRaw = row['Número do Pedido']; if (!pedidoRaw) return;
    const numeroPedido = String(Math.round(Number(pedidoRaw)));
    const comprador = String(row['Nome do comprador'] || '').trim();
    const dataPagamento = row['Data de pagamento'];
    const taxa = parseV(row['Taxas']); const juros = parseV(row['Juros']);
    if (!dataPagamento) return;
    const dataLinha = toDate(dataPagamento);
    if (!dataLinha || isNaN(dataLinha.getTime())) return;
    if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;
    if (!pedidos[numeroPedido]) pedidos[numeroPedido] = { pedido: numeroPedido, comprador, dataPagamento: dataLinha, valor: 0, juros: 0 };
    pedidos[numeroPedido].valor += (taxa + juros) * -1;
    pedidos[numeroPedido].juros += juros;
  });
  return Object.values(pedidos).map((item: any) => {
    const dataFormatada = item.dataPagamento.toLocaleDateString('pt-BR');
    const catCompleta = categoriaPai && categoriaERP ? categoriaPai.toUpperCase() + ' > ' + categoriaERP.toUpperCase() : categoriaERP.toUpperCase();
    const lineCompetencia = String(item.dataPagamento.getMonth() + 1).padStart(2,'0') + '/' + item.dataPagamento.getFullYear();
    const obs = cleanText(['NUVEM PAGO: ' + item.comprador.toUpperCase(), 'PEDIDO DE VENDA: XXXXXX/' + item.pedido + ' > NF: XX/XXXXXX > ' + (item.juros > 0 ? 'TAXA + JUROS' : 'TAXA'), catCompleta, dataFormatada, lineCompetencia].filter(Boolean).join(' | '));
    return { 'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada, 'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs, 'Valor': formatValueToBR(item.valor), 'Categoria': categoriaERP, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj };
  });
}

// ── Shopee → Bling ────────────────────────────────────────────────────────────
function convertShopeeToBling(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  const account = accounts.find(a => String(a.canal || a.channel || '').toUpperCase().trim() === 'SHOPEE');
  const portador = account?.caixa || account?.portador || '';
  const fornecedor = account?.fornecedor_razao_social || account?.fornecedor_nome_fantasia || account?.fornecedor || 'SHOPEE';
  const cnpj = account?.fornecedor_cnpj || account?.cnpj || '';
  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    let matches = categories.filter(c => { const ch = String(c.channel || c.canal || '').toUpperCase().trim(); if (ch !== 'SHOPEE') return false; return normalizeText(c.channel_category || c.categoria_canal || '') === norm; });
    if (!matches.length) matches = categories.filter(c => { const ch = String(c.channel || c.canal || '').toUpperCase().trim(); if (ch !== 'SHOPEE') return false; const key = normalizeText(c.channel_category || c.categoria_canal || ''); return key && norm && (key.includes(norm) || norm.includes(key)); });
    const match = (matches.find(c => !!(c.erp_category || c.categoria_erp)) || matches[0]);
    return { cat: match?.erp_category || match?.categoria_erp || '', pai: match?.erp_parent_category || match?.categoria_pai_erp || '' };
  };
  const POSITIVE_COLS = new Set(['taxa de envio pagas pelo comprador']);
  const resultado: BlingRow[] = [];
  data.forEach((row: any) => {
    const dataStr = row['Data de criação do pedido'] || ''; const pedido = row['ID do pedido'] || ''; const cliente = row['Nome de usuário (comprador)'] || ''; const detalhe = row['Categoria'] || '';
    const rawStr2 = String(row['Valor'] || '0'); const rawValor = Number(rawStr2.includes(',') ? rawStr2.replace(/\./g, '').replace(',', '.') : rawStr2) || 0;
    if (!dataStr || !detalhe || rawValor === 0) return;
    let dataLinha: Date;
    if (dataStr instanceof Date) { dataLinha = dataStr; }
    else if (typeof dataStr === 'number') { dataLinha = new Date(new Date(1900, 0, 1).getTime() + (dataStr - 1) * 86400000); if (dataStr > 59) dataLinha = new Date(dataLinha.getTime() - 86400000); }
    else { const parts = String(dataStr).split('/'); if (parts.length === 3) { dataLinha = new Date(+parts[2], +parts[1] - 1, +parts[0]); } else { dataLinha = new Date(dataStr); } }
    if (isNaN(dataLinha.getTime())) return;
    const iso = dataLinha.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return;
    if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
    const lineCompetencia = dataFormatada;
    const { cat, pai } = findCat(detalhe);
    const isPositive = POSITIVE_COLS.has(detalhe.toLowerCase().trim());
    const valor = isPositive ? Math.abs(rawValor) : -Math.abs(rawValor);
    const obs = ['SHOPEE: ' + cliente.toUpperCase(), 'PEDIDO DE VENDA: XXXXXX/' + pedido + ' > NF: XX/XXXXXX > ' + detalhe.toUpperCase(), pai && cat ? pai.toUpperCase() + ' > ' + cat.toUpperCase() : (cat || pai || '').toUpperCase(), dataFormatada, competencia].filter(Boolean).join(' | ');
    resultado.push({ 'ID': '', 'Data': dataFormatada, 'Competencia': lineCompetencia, 'Cliente/Fornecedor': fornecedor, 'Observacoes': obs, 'Valor': String(valor.toFixed(2)).replace('.', ','), 'Categoria': cat, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj });
  });
  return resultado;
}

// ── Shopee → Olist ────────────────────────────────────────────────────────────
function convertShopeeToOlist(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): OlistRow[] {
  const account = accounts.find(a => String(a.canal || a.channel || '').toUpperCase().trim() === 'SHOPEE');
  const portador = account?.caixa || account?.portador || '';
  const fornecedor = account?.fornecedor_razao_social || account?.fornecedor || 'SHOPEE';
  const cnpj = account?.fornecedor_cnpj || account?.cnpj || '';
  const POSITIVE_COLS = new Set(['taxa de envio pagas pelo comprador']);
  const findCat = (detalhe: string) => { const norm = normalizeText(detalhe); const m = categories.find(c => String(c.channel||c.canal||'').toUpperCase().trim() === 'SHOPEE' && normalizeText(c.channel_category||c.categoria_canal||'') === norm); return m?.erp_category || m?.categoria_erp || ''; };
  const resultado: OlistRow[] = [];
  data.forEach((row: any) => {
    const dataStr = row['Data de criação do pedido'] || ''; const pedido = row['ID do pedido'] || ''; const cliente = row['Nome de usuário (comprador)'] || ''; const detalhe = row['Categoria'] || '';
    const rawStr = String(row['Valor'] || '0'); const rawValor = Number(rawStr.includes(',') ? rawStr.replace(/\./g,'').replace(',','.') : rawStr) || 0;
    if (!dataStr || !detalhe || rawValor === 0) return;
    let dataLinha: Date; if (dataStr instanceof Date) { dataLinha = dataStr; } else { const parts = String(dataStr).split('/'); dataLinha = parts.length === 3 ? new Date(+parts[2], +parts[1]-1, +parts[0]) : new Date(dataStr); }
    if (isNaN(dataLinha.getTime())) return;
    const iso = dataLinha.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return; if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
    const lineCompetencia = String(dataLinha.getMonth()+1).padStart(2,'0') + '/' + dataLinha.getFullYear();
    const isPositive = POSITIVE_COLS.has(detalhe.toLowerCase().trim());
    const valor = isPositive ? Math.abs(rawValor) : -Math.abs(rawValor);
    const cat = findCat(detalhe);
    const obs = buildOlistObs('SHOPEE', detalhe, pedido, cliente, cat, lineCompetencia);
    resultado.push({ Data: dataFormatada, Categoria: cat, Historico: obs, ...olistTipoValor(valor), ID: '', Contato: fornecedor, CNPJ: cnpj, Marcadores: '', 'Conta de destino': portador, 'Nr documento': '' });
  });
  return resultado;
}

// ── Amazon → Bling ────────────────────────────────────────────────────────────
function convertAmazonToBling(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  const account = accounts.find(a => String(a.canal || a.channel || '').toUpperCase().trim() === 'AMAZON');
  const portador = account?.caixa || account?.portador || '';
  const fornecedor = account?.fornecedor_razao_social || account?.fornecedor_nome_fantasia || account?.fornecedor || 'AMAZON';
  const cnpj = account?.fornecedor_cnpj || account?.cnpj || '';
  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    let matches = categories.filter(c => { const ch = String(c.channel||c.canal||'').toUpperCase().trim(); if (ch !== 'AMAZON') return false; return normalizeText(c.channel_category||c.categoria_canal||'') === norm; });
    if (!matches.length) matches = categories.filter(c => { const ch = String(c.channel||c.canal||'').toUpperCase().trim(); if (ch !== 'AMAZON') return false; const key = normalizeText(c.channel_category||c.categoria_canal||''); return key && norm && (key.includes(norm) || norm.includes(key)); });
    const m = matches.find(c => c.erp_category || c.categoria_erp) || matches[0];
    return { cat: m?.erp_category||m?.categoria_erp||'', pai: m?.erp_parent_category||m?.categoria_pai_erp||'' };
  };
  const parseAmazonDate = (v: any): Date | null => {
    if (!v) return null; if (v instanceof Date) return v;
    const s = String(v); const mesesPT: Record<string,string> = {'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06','jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12'};
    const m = s.match(/(\d{1,2})\s+de\s+(\w+)\.?\s+de\s+(\d{4})/i);
    if (m) { const day = m[1].padStart(2,'0'); const mon = mesesPT[m[2].toLowerCase().replace('.','')]||'01'; return new Date(m[3]+'-'+mon+'-'+day+'T12:00:00'); }
    const d = new Date(s.replace(/GMT[+-]?\d*/g,'').trim()); return isNaN(d.getTime()) ? null : d;
  };
  const parseNum = (v: any): number => { if (typeof v === 'number') return v; return parseFloat(String(v||'0').replace(/\./g,'').replace(',','.')) || 0; };
  const resultado: BlingRow[] = [];
  data.forEach((row: any) => {
    const dataVal = row['data/hora']||''; const pedido = row['id do pedido']||''; const detalhe = row['Categoria']||''; const rawValor = row['Valor da tarifa'];
    if (!dataVal || !detalhe) return; if (detalhe.toLowerCase() === 'vendas do produto') return;
    const valor = parseNum(rawValor); if (valor === 0) return;
    const dataLinha = parseAmazonDate(dataVal); if (!dataLinha) return;
    const iso = dataLinha.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return; if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
    const mm = String(dataLinha.getMonth()+1).padStart(2,'0'); const yyyy = String(dataLinha.getFullYear());
    const competenciaMes = mm+'/'+yyyy; const lineCompetencia = dataFormatada;
    const { cat, pai } = findCat(detalhe);
    const obs = [pedido ? 'AMAZON: [CLIENTE]' : 'AMAZON', pedido ? 'PEDIDO DE VENDA: XXXXXX/'+pedido+' > NF: XX/XXXXXX > '+detalhe.toUpperCase() : detalhe.toUpperCase(), pai && cat ? pai.toUpperCase()+' > '+cat.toUpperCase() : (cat||pai||'').toUpperCase(), dataFormatada, competenciaMes].filter(Boolean).join(' | ');
    resultado.push({ 'ID': '', 'Data': dataFormatada, 'Competencia': lineCompetencia, 'Cliente/Fornecedor': fornecedor, 'Observacoes': obs, 'Valor': String(valor.toFixed(2)).replace('.',','), 'Categoria': cat, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj });
  });
  return resultado;
}

// ── Amazon → Olist ────────────────────────────────────────────────────────────
function convertAmazonToOlist(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): OlistRow[] {
  const account = accounts.find(a => String(a.canal||a.channel||'').toUpperCase().trim() === 'AMAZON');
  const portador = account?.caixa||account?.portador||''; const fornecedor = account?.fornecedor_razao_social||account?.fornecedor||'AMAZON'; const cnpj = account?.fornecedor_cnpj||account?.cnpj||'';
  const mesesPT: Record<string,string> = {'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06','jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12'};
  const parseAmazonDate = (v: any): Date | null => { if (!v) return null; if (v instanceof Date) return v; const s = String(v); const m = s.match(/(\d{1,2})\s+de\s+(\w+)\.?\s+de\s+(\d{4})/i); if (m) { return new Date(m[3]+'-'+(mesesPT[m[2].toLowerCase().replace('.','')] ||'01')+'-'+m[1].padStart(2,'0')+'T12:00:00'); } const d = new Date(s.replace(/GMT[+-]?\d*/g,'').trim()); return isNaN(d.getTime()) ? null : d; };
  const parseNum = (v: any) => { if (typeof v === 'number') return v; return parseFloat(String(v||'0').replace(/\./g,'').replace(',','.')) || 0; };
  const findCat = (detalhe: string) => { const norm = normalizeText(detalhe); const m = categories.find(c => String(c.channel||c.canal||'').toUpperCase().trim() === 'AMAZON' && normalizeText(c.channel_category||c.categoria_canal||'') === norm); return m?.erp_category||m?.categoria_erp||''; };
  const resultado: OlistRow[] = [];
  data.forEach((row: any) => {
    const dataVal = row['data/hora']||''; const pedido = row['id do pedido']||''; const detalhe = row['Categoria']||''; const rawValor = row['Valor da tarifa'];
    if (!dataVal || !detalhe || detalhe.toLowerCase() === 'vendas do produto') return;
    const valor = parseNum(rawValor); if (valor === 0) return;
    const dataLinha = parseAmazonDate(dataVal); if (!dataLinha) return;
    const iso = dataLinha.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return; if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataLinha.toLocaleDateString('pt-BR');
    const lineCompetencia = String(dataLinha.getMonth()+1).padStart(2,'0')+'/'+dataLinha.getFullYear();
    const cat = findCat(detalhe);
    const obs = buildOlistObs('AMAZON', detalhe, pedido, '', cat, lineCompetencia);
    resultado.push({ Data: dataFormatada, Categoria: cat, Historico: obs, ...olistTipoValor(valor), ID: '', Contato: fornecedor, CNPJ: cnpj, Marcadores: '', 'Conta de destino': portador, 'Nr documento': '' });
  });
  return resultado;
}

// ── Magazine Luiza → Bling ────────────────────────────────────────────────────
function convertMagaluToBling(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  if (!data?.length) return [];
  const conta = accounts.find(a => String(a.canal||a.channel||'').toUpperCase().trim() === 'MAGAZINE LUIZA');
  const portador = conta?.caixa||conta?.portador||''; const fornecedor = conta?.fornecedor_razao_social||conta?.fornecedor||'MAGAZINE LUIZA'; const cnpj = conta?.fornecedor_cnpj||conta?.cnpj||'';

  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    // startsWith match so "TARIFA FIXA" matches "TARIFA FIXA POR PACOTE"
    let m = categories.find(c => {
      if (String(c.channel||c.canal||'').toUpperCase().trim() !== 'MAGAZINE LUIZA') return false;
      const catNorm = normalizeText(c.channel_category||c.categoria_canal||'');
      return catNorm === norm || catNorm.startsWith(norm) || norm.startsWith(catNorm);
    });
    if (!m) m = categories.find(c => { if (String(c.channel||c.canal||'').toUpperCase().trim() !== 'MAGAZINE LUIZA') return false; const catNorm = normalizeText(c.channel_category||c.categoria_canal||''); return catNorm.includes(norm) || norm.includes(catNorm); });
    return { cat: m?.erp_category||m?.categoria_erp||'', pai: m?.erp_parent_category||m?.categoria_pai_erp||'' };
  };

  const resultado: BlingRow[] = [];
  data.forEach((row: any) => {
    const dataVal = row['Data do Pedido']||row['Data']||''; const pedido = row['Número do pedido']||''; const cliente = row['Nome do cliente']||''; const detalhe = row['Categoria']||'';
    const valor = typeof row['Valor'] === 'number' ? row['Valor'] : parseFloat(String(row['Valor']||'0').replace(',','.')) || 0;
    if (!dataVal || !detalhe || valor === 0) return;
    const dataObj = parseDateBR(dataVal); if (!dataObj) return;
    const iso = dataObj.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return; if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
    const mm = String(dataObj.getMonth()+1).padStart(2,'0'); const lineCompetencia = mm+'/'+dataObj.getFullYear();
    const { cat, pai } = findCat(detalhe);
    const obs = [cliente ? 'MAGAZINE LUIZA: '+cliente.toUpperCase() : 'MAGAZINE LUIZA', pedido ? 'PEDIDO: '+pedido+' > '+detalhe.toUpperCase() : detalhe.toUpperCase(), pai && cat ? pai.toUpperCase()+' > '+cat.toUpperCase() : (cat||pai||'').toUpperCase(), dataFormatada, lineCompetencia].filter(Boolean).join(' | ');
    resultado.push({ 'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada, 'Cliente/Fornecedor': fornecedor, 'Observacoes': obs, 'Valor': String(valor.toFixed(2)).replace('.',','), 'Categoria': cat, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj });
  });
  return resultado;
}

// ── Magazine Luiza → Olist ───────────────────────────────────────────────────
function convertMagaluToOlist(
  data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): OlistRow[] {
  if (!data?.length) return [];
  const conta = accounts.find(a => String(a.canal||a.channel||'').toUpperCase().trim() === 'MAGAZINE LUIZA');
  const portador = conta?.caixa||conta?.portador||''; const fornecedor = conta?.fornecedor_razao_social||conta?.fornecedor||'MAGAZINE LUIZA'; const cnpj = conta?.fornecedor_cnpj||conta?.cnpj||'';
  const findCat = (detalhe: string) => {
    const norm = normalizeText(detalhe);
    let m = categories.find(c => { if (String(c.channel||c.canal||'').toUpperCase().trim() !== 'MAGAZINE LUIZA') return false; const catNorm = normalizeText(c.channel_category||c.categoria_canal||''); return catNorm === norm || catNorm.startsWith(norm) || norm.startsWith(catNorm); });
    if (!m) m = categories.find(c => { if (String(c.channel||c.canal||'').toUpperCase().trim() !== 'MAGAZINE LUIZA') return false; const catNorm = normalizeText(c.channel_category||c.categoria_canal||''); return catNorm.includes(norm)||norm.includes(catNorm); });
    return { cat: m?.erp_category||m?.categoria_erp||'', pai: m?.erp_parent_category||m?.categoria_pai_erp||'' };
  };
  const resultado: OlistRow[] = [];
  data.forEach((row: any) => {
    const dataVal = row['Data do Pedido']||row['Data']||''; const pedido = row['Número do pedido']||''; const cliente = row['Nome do cliente']||''; const detalhe = row['Categoria']||'';
    const valor = typeof row['Valor'] === 'number' ? row['Valor'] : parseFloat(String(row['Valor']||'0').replace(',','.')) || 0;
    if (!dataVal || !detalhe || valor === 0) return;
    const dataObj = parseDateBR(dataVal); if (!dataObj) return;
    const iso = dataObj.toISOString().split('T')[0];
    if (dataInicial && iso < dataInicial) return; if (dataFinal && iso > dataFinal) return;
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
    const mm = String(dataObj.getMonth()+1).padStart(2,'0'); const lineCompetencia = mm+'/'+dataObj.getFullYear();
    const { cat } = findCat(detalhe);
    const obs = buildOlistObs('MAGAZINE LUIZA', detalhe, pedido, cliente, cat, lineCompetencia);
    resultado.push({ Data: dataFormatada, Categoria: cat, Historico: obs, ...olistTipoValor(valor), ID: '', Contato: fornecedor, CNPJ: cnpj, Marcadores: '', 'Conta de destino': portador, 'Nr documento': '' });
  });
  return resultado;
}

// ── Dispatchers ───────────────────────────────────────────────────────────────
export function convertToBling(
  canal: string, data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): BlingRow[] {
  if (canal === 'MERCADO LIVRE') return convertMLToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'NUVEM PAGO')    return convertNuvemPagoToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'SHOPEE')        return convertShopeeToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'AMAZON')        return convertAmazonToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'MAGAZINE LUIZA' || canal === 'MAGALU') return convertMagaluToBling(data, dataInicial, dataFinal, competencia, categories, accounts);
  return [];
}

export function convertToOlist(
  canal: string, data: any[], dataInicial: string, dataFinal: string,
  competencia: string, categories: any[], accounts: any[]
): OlistRow[] {
  if (canal === 'MERCADO LIVRE') return convertMLToOlist(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'SHOPEE')        return convertShopeeToOlist(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'AMAZON')        return convertAmazonToOlist(data, dataInicial, dataFinal, competencia, categories, accounts);
  if (canal === 'MAGAZINE LUIZA' || canal === 'MAGALU') return convertMagaluToOlist(data, dataInicial, dataFinal, competencia, categories, accounts);
  return [];
}
