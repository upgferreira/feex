import React, { useState, useEffect } from 'react';
import { Download, Trash2, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExportRecord } from '../types';
import { ExportModal } from './ExportModal';
import { DataTable, FormatBadge, DataTableColumn } from './DataTable';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useFileData } from '../hooks/useFileData';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import { convertToBling, convertToOlist, formatDateToBR, formatValueToBR, cleanText, BlingRow, OlistRow } from '../utils/converters';

export const Exportacao: React.FC = () => {
  const { files, getAllChannelData } = useFileData();
  const canais = React.useMemo(() => [...new Set(files.map((f: any) => f.canal))].sort(), [files]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof ExportRecord | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { user } = useAuth();
  const { getCategories, getAccounts } = useAdmin();

  useEffect(() => {
    if (user) {
      loadExportRecords();
      loadCategories();
      loadAccounts();
    }
  }, [user]);

  const loadCategories = async () => {
    try { setCategories(await getCategories()); }
    catch (e) { console.error('Erro ao carregar categorias:', e); }
  };

  const loadAccounts = async () => {
    try {
      const { data } = await supabase.from('financial_accounts').select('*').order('canal', { ascending: true });
      setAccounts(data || []);
    } catch (e) { console.error('Erro ao carregar contas:', e); }
  };

  const loadExportRecords = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('exported_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExportRecords(data.map(r => ({
        id: r.id,
        canal: r.channel,
        erp: r.type,
        ano: r.year,
        competencia: r.competence,
        periodoInicial: r.start_period,
        periodoFinal: r.end_period,
        formatos: Array.isArray(r.format) ? r.format : (r.format ? [r.format] : []),
        arquivo: r.file_name,
        dataDownload: new Date(r.created_at),
      })));
    } catch (e) { console.error('Error loading export records:', e); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const normalizeText = (text: string) => {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  };

  const findMappedCategory = (detalhe: string): string => {
    if (!detalhe) return 'Nao mapeado';
    const norm = normalizeText(detalhe);
    const match = categories.find(c => {
      const ch = String(c.channel || c.canal || '').toUpperCase().trim();
      if (ch !== 'MERCADO LIVRE') return false;
      const key = normalizeText(c.channel_category || c.categoria_canal || '');
      return key === norm || key.includes(norm) || norm.includes(key);
    });
    console.log('findMappedCategory:', detalhe, '->', match?.erp_category || match?.categoria_erp, '| categories count:', categories.length);
    return match?.erp_category || match?.categoria_erp || 'Nao mapeado';
  };

  const convertExcelDate = (serialDate: number): string => {
    if (!serialDate || isNaN(serialDate)) return '';
    const d = new Date(new Date(1900, 0, 1).getTime() + (serialDate - 1) * 86400000);
    if (serialDate > 59) d.setTime(d.getTime() - 86400000);
    return d.toLocaleDateString('pt-BR');
  };

  const cleanText = (text: string) =>
    text ? text.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim() : '';

  const formatDateToBR = (dateString: string): string => {
    const serial = Number(dateString);
    if (!isNaN(serial) && serial > 1 && serial < 100000) return convertExcelDate(serial);
    if (dateString.includes('/')) return dateString;
    if (dateString.includes('-')) {
      const [y, m, d] = dateString.split('-');
      return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
    }
    return dateString;
  };

  const formatValueToBR = (value: number) => value.toFixed(2).replace('.', ',');

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);

  const formatDateForFileName = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') return '01-01-1970';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString.replace(/[^\d-]/g, '') || '01-01-1970';
  };

  // ── Converters ────────────────────────────────────────────────────────────
  const convertMercadoLivreToBling = (data: any[], dataInicial: string, dataFinal: string, competencia: string) => {
    if (!data?.length) return [];
    const clienteFornecedor = 'EBAZAR.COM.BR. LTDA';
    const portador = 'Banco | MERCADO PAGO | C/C';
    const cnpj = '03.007.331/0001-41';
    const dataInicialObj = new Date(dataInicial);
    const dataFinalObj = new Date(dataFinal);
    const resultado: any[] = [];

    data.forEach((row, index) => {
      try {
        const dataTarifa = row['Data da tarifa'];
        const detalhe = row['Detalhe'];
        const valorTarifa = row['Valor da tarifa'];
        const numVenda = row['Número da venda'];
        const cliente = row['Cliente'];
        if (!dataTarifa || !detalhe || valorTarifa == null) return;

        let dataLinha: Date, dataFormatada: string;
        if (typeof dataTarifa === 'number') {
          dataFormatada = convertExcelDate(dataTarifa);
          const [d, m, y] = dataFormatada.split('/');
          dataLinha = new Date(+y, +m - 1, +d);
        } else if (typeof dataTarifa === 'string') {
          if (dataTarifa.includes('/')) {
            dataFormatada = dataTarifa;
            const [d, m, y] = dataTarifa.split('/');
            dataLinha = new Date(+y, +m - 1, +d);
          } else {
            dataLinha = new Date(dataTarifa);
            dataFormatada = dataLinha.toLocaleDateString('pt-BR');
          }
        } else {
          dataLinha = new Date(dataTarifa);
          dataFormatada = dataLinha.toLocaleDateString('pt-BR');
        }

        if (isNaN(dataLinha.getTime()) || dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;

        const categoria = findMappedCategory(detalhe);
        const obs = cleanText([
          'MERCADO LIVRE',
          cleanText([detalhe, numVenda, cliente].filter(Boolean).join(' > ').toUpperCase()),
          categoria.toUpperCase(),
          `${formatDateToBR(dataInicial)} - ${formatDateToBR(dataFinal)}`,
          competencia,
        ].filter(Boolean).join(' | '));

        resultado.push({
          'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada,
          'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs,
          'Valor': formatValueToBR(Number(valorTarifa) * -1),
          'Categoria': categoria, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj,
        });
      } catch (e) { console.error(`Linha ${index}:`, e); }
    });
    return resultado;
  };

  const convertNuvemPagoToBling = (data: any[], dataInicial: string, dataFinal: string, competencia: string) => {
    if (!data?.length) return [];

    const conta = accounts.find(a => String(a.canal || '').toUpperCase().trim() === 'NUVEM PAGO');
    console.log('NuvemPago conta:', conta, 'from accounts:', accounts.map(a=>a.canal));
    const portador          = conta?.caixa                    || '';
    const clienteFornecedor = conta?.fornecedor_nome_fantasia || 'NUVEM PAGO';
    const cnpj              = conta?.fornecedor_cnpj          || '';

    const catRow = categories.find(c => {
      const canal    = String(c.channel || c.canal || '').toUpperCase();
      const catCanal = String(c.channel_category || c.categoria_canal || '').toUpperCase();
      return canal === 'NUVEM PAGO' && catCanal === 'TAXAS';
    });
    const categoriaERP = catRow?.erp_category || catRow?.categoria_erp || '';
    const categoriaPai = catRow?.erp_parent_category || catRow?.categoria_pai_erp || '';

    const pedidos: Record<string, any> = {};
    // Set date range with time at start/end of day to avoid boundary issues
    const dataInicialObj = new Date(dataInicial + 'T00:00:00');
    const dataFinalObj   = new Date(dataFinal   + 'T23:59:59');

    const parseValor = (v: any) => {
      if (v == null || v === '') return 0;
      const s = String(v).trim().replace('R$','').replace(/\s/g,'');
      // BR format: 1.234,56 → has comma as decimal
      if (s.includes(',')) return Number(s.replace(/\./g,'').replace(',','.')) || 0;
      // EN format: 7.25 → dot is decimal, parse directly
      return Number(s) || 0;
    };

    data.forEach(row => {
      // Pedido pode vir como número float (ex: 146.0) — converter para inteiro string
      const pedidoRaw = row['Número do Pedido'];
      if (pedidoRaw == null || pedidoRaw === '') return;
      const numeroPedido  = String(Math.round(Number(pedidoRaw)));
      const comprador     = String(row['Nome do comprador'] || '').trim();
      const dataPagamento = row['Data de pagamento'];
      const taxa  = parseValor(row['Taxas']);
      const juros = parseValor(row['Juros']);
      if (!numeroPedido || !dataPagamento) return;

      // Data pode vir como Date object, string ISO, ou número serial
      let dataLinha: Date;
      if (dataPagamento instanceof Date) {
        dataLinha = dataPagamento;
      } else if (typeof dataPagamento === 'number') {
        dataLinha = new Date(Math.round((dataPagamento - 25569) * 86400 * 1000));
      } else {
        dataLinha = new Date(dataPagamento);
      }
      if (isNaN(dataLinha.getTime())) return;
      if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) return;

      if (!pedidos[numeroPedido]) {
        pedidos[numeroPedido] = { pedido: numeroPedido, comprador, dataPagamento: dataLinha, valor: 0, juros: 0 };
      }
      pedidos[numeroPedido].valor += (taxa + juros) * -1;
      pedidos[numeroPedido].juros += juros;
    });

    return Object.values(pedidos).map((item: any) => {
      const dataFormatada = item.dataPagamento.toLocaleDateString('pt-BR');
      const obs = cleanText([
        `NUVEM PAGO: ${item.comprador.toUpperCase()}`,
        [`PEDIDO DE VENDA: XXXXXX/${item.pedido}`, 'NF: XX/XXXXXX', item.juros > 0 ? 'TAXA + JUROS' : 'TAXA'].join(' > '),
        categoriaPai && categoriaERP ? `${categoriaPai.toUpperCase()} > ${categoriaERP.toUpperCase()}` : '',
        `${formatDateToBR(dataInicial)} - ${formatDateToBR(dataFinal)}`,
        competencia,
      ].filter(Boolean).join(' | '));
      return {
        'ID': '', 'Data': dataFormatada, 'Competencia': dataFormatada,
        'Cliente/Fornecedor': clienteFornecedor, 'Observacoes': obs,
        'Valor': formatValueToBR(item.valor),
        'Categoria': categoriaERP, 'Portador': portador, 'Saldo': 'N', 'CNPJ': cnpj,
      };
    });
  };

  const generateEmptyBlingTemplate = () => [{
    'ID': '', 'Data': '', 'Competencia': '', 'Cliente/Fornecedor': '',
    'Observacoes': '', 'Valor': '', 'Categoria': '', 'Portador': '', 'Saldo': '', 'CNPJ': '',
  }];

  // ── File generation ───────────────────────────────────────────────────────
  const generateFileName = (exportData: any, formato: string): string => {
    const { canal, erp, ano, dataInicial, dataFinal } = exportData;
    const canalFmt = canal.replace(/ /g,'_');
    const dataInicialObj = dataInicial ? new Date(dataInicial) : new Date();
    const comp = (dataInicialObj.getMonth() + 1).toString().padStart(2, '0');
    const yr = ano || new Date().getFullYear();
    if (erp === 'BLING') {
      return canalFmt + '_FATURAMENTO_' + yr + '_' + comp + '-' + yr + '_' + formatDateForFileName(dataInicial) + '_' + formatDateForFileName(dataFinal) + '_bling-modelo-registro-caixa.' + formato.toLowerCase();
    }
    if (erp === 'OLIST') {
      return canalFmt + '_FATURAMENTO_' + yr + '_' + comp + '-' + yr + '_' + formatDateForFileName(dataInicial) + '_' + formatDateForFileName(dataFinal) + '_olist.' + formato.toLowerCase();
    }
    return 'dados_exportacao_' + canal + '_' + new Date().toISOString().split('T')[0] + '.' + formato.toLowerCase();
  };

  const exportToCSV = (data: any[], fileName?: string, erpType?: string) => {
    if (!data.length) return;
    const SEP = ';'; // semicolon for Excel PT-BR and Bling compatibility
    const olistKeys = ['Data','Categoria','Historico','Tipo','Valor','ID','Contato','CNPJ','Marcadores','Conta de destino','Nr documento'];
    const blingKeys = ['ID','Data','Competencia','Cliente/Fornecedor','Observacoes','Valor','Categoria','Portador','Saldo','CNPJ'];
    const autoKeys = Object.keys(data[0]);
    const escape = (v: any) => {
      const s = v == null ? '' : v.toString();
      return s.includes(SEP) || s.includes('\n') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(SEP), ...data.map(row => headers.map(h => escape(row[h])).join(SEP))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = fileName || `exportacao_${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  };

  const exportToExcel = (data: any[], format: 'xlsx' | 'xls', fileName?: string) => {
    if (!data.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Dados');
    XLSX.writeFile(wb, fileName || `exportacao_${Date.now()}.${format}`);
  };

  const exportToOFX = (data: any[], fileName?: string) => {
    if (!data.length) return;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const content = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>${now}<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1></OFX>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/x-ofx' }));
    a.download = fileName || `exportacao_${Date.now()}.ofx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  };

  const SHOPEE_PIVOT_COLS = [
    'Taxa de Envio Reversa',
    'Taxa de transação',
    'Taxa de comissão líquida',
    'Taxa de comissão',
    'Taxa de serviço líquida',
    'Taxa de serviço',
    'Desconto de Frete Aproximado',
    'Desconto do vendedor',
    'Taxa de envio pagas pelo comprador',
  ];
  const SHOPEE_POSITIVE = new Set(['Taxa de envio pagas pelo comprador']);

  const pivotShopeeData = (data: any[]): any[] => {
    const result: any[] = [];
    data.forEach((row: any) => {
      const status = String(row['Status do pedido'] || '').toLowerCase();
      if (status.includes('cancelado')) return;
      SHOPEE_PIVOT_COLS.forEach(col => {
        const colKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
        if (!colKey) return;
        const _rawCell = String(row[colKey] || '0');
        let valor = parseFloat(
          _rawCell.includes(',') ? _rawCell.replace(/\./g, '').replace(',', '.') : _rawCell
        ) || 0;
        if (valor === 0) return;
        valor = SHOPEE_POSITIVE.has(col) ? Math.abs(valor) : -Math.abs(valor);
        result.push({
          'Data de criação do pedido': row['Data de criação do pedido'],
          'ID do pedido':              row['ID do pedido'],
          'Nome de usuário (comprador)': row['Nome de usuário (comprador)'],
          'Categoria':                 col.replace(/\s*\(\d+\)\s*/g, '').trim(),
          'Valor':                     valor,
        });
      });
    });
    return result;
  };

  const getConvertedData = (canal: string, erp: string, dataInicial: string, dataFinal: string, competencia: string) => {
    const rawData = getAllChannelData(canal);

    const parseNumAmazon = (v: any) => {
      if (typeof v === 'number') return v;
      const s = String(v || '0').replace(/\./g, '').replace(',', '.');
      return parseFloat(s) || 0;
    };

    const pivotAmazonData = (rows: any[]): any[] => {
      const PIVOT_COLS = [
        'créditos de remessa','créditos de embalagem de presente','descontos promocionais',
        'imposto de vendas coletados','tarifas de venda','taxas fba','taxas de outras transações',
        'outro','vendas do produto',
      ];
      const result: any[] = [];
      rows.forEach((row: any) => {
        const tipo = String(row['tipo'] || '').toLowerCase();
        if (tipo === 'transferir') return;
        if (tipo === 'pedido') {
          PIVOT_COLS.forEach(col => {
            const colKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
            if (!colKey) return;
            const valor = parseNumAmazon(row[colKey]);
            if (valor === 0) return;
            result.push({
              'data/hora': row['data/hora'], 'id de liquidação': row['id de liquidação'],
              'tipo': row['tipo'], 'id do pedido': row['id do pedido'],
              'tipo de conta': row['tipo de conta'], 'Categoria': col,
              'Valor da tarifa': valor, 'Relatório': row['Relatório'],
            });
          });
        } else {
          const valor = parseNumAmazon(row['total']);
          if (valor === 0) return;
          const categoria = tipo === 'reembolso' ? 'Reembolso' : (row['descrição'] || row['tipo'] || '');
          result.push({
            'data/hora': row['data/hora'], 'id de liquidação': row['id de liquidação'],
            'tipo': row['tipo'], 'id do pedido': row['id do pedido'],
            'tipo de conta': row['tipo de conta'], 'Categoria': categoria,
            'Valor da tarifa': valor, 'Relatório': row['Relatório'],
          });
        }
      });
      return result;
    };

    // Pivot before converting
    const channelData = canal === 'SHOPEE' ? pivotShopeeData(rawData)
                      : canal === 'AMAZON' ? pivotAmazonData(rawData)
                      : rawData;
    if (erp === 'BLING') {
      try {
        const result = convertToBling(canal, channelData, dataInicial, dataFinal, competencia, categories, accounts);
        return result?.length ? result : generateEmptyBlingTemplate();
      } catch (e) {
        console.error('Erro na conversão:', e);
        return generateEmptyBlingTemplate();
      }
    }
    if (erp === 'OLIST') {
      try {
        return convertToOlist(canal, channelData, dataInicial, dataFinal, competencia, categories, accounts);
      } catch (e) {
        console.error('Erro na conversão Olist:', e);
        return [];
      }
    }
    return channelData;
  };

  const saveExportRecord = async (exportData: { canal: string; erp: string; dataInicial: string; dataFinal: string; formatos: string[] }) => {
    if (!user) return;
    try {
      const dataObj = new Date(exportData.dataInicial);
      const ano = dataObj.getFullYear().toString();
      const competence = (dataObj.getMonth() + 1).toString().padStart(2, '0') + '/' + ano;
      const fileName = generateFileName({ ...exportData, ano }, exportData.formatos[0]);
      const { data, error } = await supabase.from('exported_files').insert({
        channel: exportData.canal, type: exportData.erp, year: ano, competence,
        start_period: exportData.dataInicial, end_period: exportData.dataFinal,
        format: exportData.formatos, file_name: fileName.replace(/\.[^/.]+$/, ''),
        file_data: {}, user_id: user.id,
      }).select().single();
      if (error) throw error;
      setExportRecords(prev => [{
        id: data.id, canal: data.channel, erp: data.type, ano: data.year,
        competencia: data.competence, periodoInicial: data.start_period,
        periodoFinal: data.end_period, formatos: Array.isArray(data.format) ? data.format : (data.format ? [data.format] : []),
        arquivo: data.file_name, dataDownload: new Date(data.created_at),
      }, ...prev]);
      // Also reload to ensure consistency
      await loadExportRecords();
    } catch (e) { console.error('Erro ao salvar exported_file:', JSON.stringify(e)); }
  };

  const handleExport = async (exportData: { canal: string; erp: string; dataInicial: string; dataFinal: string; formatos: string[] }) => {
    const dataObj = new Date(exportData.dataInicial);
    const ano = dataObj.getFullYear().toString();
    const competencia = (dataObj.getMonth() + 1).toString().padStart(2, '0') + '/' + ano;
    const finalData = getConvertedData(exportData.canal, exportData.erp, exportData.dataInicial, exportData.dataFinal, competencia);

    // Block export if any row has empty category
    if (exportData.erp === 'BLING') {
      const semCategoria = finalData.filter((r: any) => !r['Categoria'] || r['Categoria'].trim() === '' || r['Categoria'] === 'Nao mapeado');
      if (semCategoria.length > 0) {
        alert(`⚠️ ${semCategoria.length} registro(s) sem categoria mapeada. Verifique o mapeamento de categorias antes de exportar.`);
        return;
      }
    }

    await saveExportRecord(exportData);
    exportData.formatos.forEach(formato => {
      const fileName = generateFileName({ ...exportData, ano }, formato);
      try {
        if (formato === 'CSV')       exportToCSV(finalData, fileName, record.erp);
        else if (formato === 'XLSX') exportToExcel(finalData, 'xlsx', fileName);
        else if (formato === 'XLS')  exportToExcel(finalData, 'xls', fileName);
        else if (formato === 'OFX')  exportToOFX(finalData, fileName);
      } catch (e) { console.error(`Erro ao gerar ${formato}:`, e); }
    });
  };

  const CHUNK_SIZE = 1000;

  const handleDownloadRecord = (record: ExportRecord) => {
    const finalData = getConvertedData(record.canal, record.erp, record.periodoInicial, record.periodoFinal, record.competencia);
    const chunks: any[][] = [];
    for (let i = 0; i < finalData.length; i += CHUNK_SIZE) chunks.push(finalData.slice(i, i + CHUNK_SIZE));
    if (chunks.length === 0) chunks.push(finalData);
    const needsSplit = chunks.length > 1;
    record.formatos.forEach(formato => {
      chunks.forEach((chunk, idx) => {
        const baseName = generateFileName(record, formato);
        const ext = '.' + formato.toLowerCase();
        const fileName = needsSplit ? baseName.replace(ext, '_parte' + String(idx + 1).padStart(2, '0') + ext) : baseName;
        if (formato === 'CSV')       exportToCSV(chunk, fileName, record.erp);
        else if (formato === 'XLSX') exportToExcel(chunk, 'xlsx', fileName);
        else if (formato === 'XLS')  exportToExcel(chunk, 'xls', fileName);
        else if (formato === 'OFX')  exportToOFX(chunk, fileName);
      });
    });
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!recordToDelete || !user) return false;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email!, password });
      if (error) return false;
      const { error: deleteError } = await supabase.from('exported_files').delete().eq('id', recordToDelete).eq('user_id', user.id);
      if (deleteError) throw deleteError;
      setExportRecords(prev => prev.filter(r => r.id !== recordToDelete));
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      return true;
    } catch { return false; }
  };

  const filteredAndSortedRecords = React.useMemo(() => {
    let result = [...exportRecords];
    Object.entries(columnFilters).forEach(([col, val]) => {
      if (val) result = result.filter(r => {
        const v = r[col as keyof ExportRecord];
        if (Array.isArray(v)) return v.some(x => x.toLowerCase().includes(val.toLowerCase()));
        return v?.toString().toLowerCase().includes(val.toLowerCase());
      });
    });
    if (sortColumn) {
      result.sort((a, b) => {
        const av = a[sortColumn], bv = b[sortColumn];
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = av instanceof Date && bv instanceof Date ? av.getTime() - bv.getTime() : av.toString().localeCompare(bv.toString());
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [exportRecords, columnFilters, sortColumn, sortDirection]);

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Exportação de Dados</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">{filteredAndSortedRecords.length} registro(s)</span>
            </div>
            <button onClick={() => setExportModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Download Arquivo
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'canal', label: 'Canal', render: (v: string) => (
              <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + (v === 'AMAZON' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : v === 'MERCADO LIVRE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : v === 'MAGAZINE LUIZA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : v === 'SHEIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : v === 'SHOPEE' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}>{v}</span>
            )},
            { key: 'erp', label: 'Tipo', render: (v: string) => (
              <span className={'inline-flex px-2 py-0.5 rounded text-xs font-medium ' + (v === 'BLING' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}>{v}</span>
            )},
            { key: 'ano', label: 'Ano', width: 'compact' as const },
            { key: 'competencia', label: 'Competência', width: 'compact' as const },
            { key: 'periodoInicial', label: 'Período Inicial', width: 'compact' as const, render: (v: string) => v ? formatDateToBR(v) : '-' },
            { key: 'periodoFinal', label: 'Período Final', width: 'compact' as const, render: (v: string) => v ? formatDateToBR(v) : '-' },
            { key: 'arquivo', label: 'Arquivo', width: 'wrap' as const },
            { key: 'formatos', label: 'Formato', render: (v: string[]) => v?.length ? <FormatBadge value={v[0]} /> : '-' },
            { key: 'dataDownload', label: 'Data Download', width: 'compact' as const, render: (v: Date) => v ? formatDate(v) : '-' },
          ]}
          data={filteredAndSortedRecords}
          rowKey={row => row.id}
          emptyIcon={<Download className="w-12 h-12 text-gray-400" />}
          emptyText="Nenhum arquivo exportado"
          emptySubText="Clique em Download Arquivo para gerar uma exportação"
          actions={record => (
            <div className="flex items-center gap-2">
              <button onClick={() => handleDownloadRecord(record)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Download"><Download className="w-4 h-4" /></button>
              <button onClick={() => { setRecordToDelete(record.id); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Excluir"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        />
      </div>

      <ExportModal isOpen={exportModalOpen} canais={canais} onClose={() => setExportModalOpen(false)} onExport={handleExport} />
      <DeleteConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />
    </>
  );
};
