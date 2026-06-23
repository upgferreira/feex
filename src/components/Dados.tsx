import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, CartesianGrid, XAxis, YAxis, Bar,
} from 'recharts';
import {
  ShoppingCart, CreditCard, DollarSign, TrendingDown,
  TrendingUp, Receipt, BarChart2, Calendar,
  ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Filter, Download, X, Image,
} from 'lucide-react';
import { useFileData } from '../hooks/useFileData';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import { convertToBling, toDateStr } from '../utils/converters';
import { ColumnFilter, FilterBadge } from './ColumnFilter';
import { DateRangePicker } from './DateRangePicker';

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return val;
  if (typeof val === 'number' && val > 1 && val < 100000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toLocaleDateString('pt-BR');
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('pt-BR');
}

const CANAIS = ['AMAZON', 'MAGAZINE LUIZA', 'MERCADO LIVRE', 'SHEIN', 'SHOPEE'];
const ROWS_PER_PAGE = 100;
const COLORS = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

const ML_GRUPO_MAP: Record<string, string> = {
  "Custo de gestão da venda": "Taxas",
  "Tarifa de venda": "Taxas",
  "Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Taxas",
  "Taxas de parcelamento": "Taxas",
  "Taxa de parcelamento": "Taxas",
  "Custo por vender no Mercado Livre": "Taxas",
  "Custo por cobrar no Mercado Pago": "Taxas",
  "Taxas de recebimento": "Taxas",
  "Taxa de recebimento": "Taxas",
  "Tarifa de venda com afiliados": "Taxas",
  "Custo por inconformidade no Envios Full": "Taxas",
  "Tarifas dos serviços do Mercado Pago": "Taxas",
  "Cancelamento da tarifa de devolução por envio externo ou intermunicipal": "Fretes",
  "Cancelamento da tarifa por envio interno ao município": "Fretes",
  "Cancelamento da tarifa de envio extra ou intermunicipal": "Fretes",
  "Estorno do custo de envio externo ou inter municipal": "Fretes",
  "Estorno do custo de Mercado Envios": "Fretes",
  "Tarifa de devolução por envio externo ou intermunicipal": "Fretes",
  "Tarifa de devolução por envio interno no município": "Fretes",
  "Tarifa de envio interno à cidade": "Fretes",
  "Tarifa por envio interno ao município": "Fretes",
  "Tarifa de envio extra ou intermunicipal": "Fretes",
  "Tarifa do Mercado Envios": "Fretes",
  "Tarifa de devolução": "Fretes",
  "Cancelamento da tarifa de manutenção da Minha página": "Outros",
  "Cancelamento da tarifa de venda": "Outros",
  "Cancelamento da tarifa por campanhas de publicidade - Product Ads": "Outros",
  "Cancelamento da tarifa por devolução": "Outros",
  "Cancelamento da tarifa por serviço de armazenamento Full": "Outros",
  "Cancelamento da tarifa por serviço de coleta Full": "Outros",
  "Estorno da tarifa de manutenção do eShop": "Outros",
  "Estorno da tarifa de venda": "Outros",
  "Estorno do custo de gestão da venda": "Outros",
  "Cancelamento do custo por inconformidade no Envios Full": "Outros",
  "Custo de armazenamento prolongado no Full": "Outros",
  "Custo do serviço de coleta Full": "Outros",
  "Custo por retirada de estoque Full": "Outros",
  "Custo por retirada ou descarte de estoque Full": "Outros",
  "Tarifa pelo serviço de armazenamento": "Outros",
  "Tarifa pelo serviço de armazenamento Full": "Outros",
  "Tarifa por estoque antigo no Full": "Outros",
  "Tarifa de manutenção da Minha página": "Outros",
  "Tarifa de manutenção do eShop": "Outros",
  "Campanhas de publicidade - Product Ads": "Outros",
  "Tarifa por campanha de publicidade no Google Ads pelo Mercado Shops": "Outros",
  "Cancelamento da Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Outros",
};

type ViewMode = 'dashboard' | 'tabela' | 'matriz';

interface DadosProps {
  selectedCanal?: string;
}

export const Dados: React.FC<DadosProps> = ({ selectedCanal: externalCanal }) => {
  const { files, getAllChannelData } = useFileData();
  const [canal, setCanal] = useState<string>(externalCanal || 'TODOS');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [dataView, setDataView] = useState<'canal' | 'erp'>('canal');

  const handleSetDataView = (dv: 'canal' | 'erp') => {
    if (dv === 'erp') {
      getCategories().then(setCategories).catch(console.error);
      getAccounts().then(setAccounts).catch(console.error);
    }
    setDataView(dv);
  };
  const [erpSortCol, setErpSortCol] = useState<string | null>(null);
  const [erpSortDir, setErpSortDir] = useState<'asc' | 'desc'>('asc');
  const [erpColFilters, setErpColFilters] = useState<Record<string, string[]>>({});
  const [erpActiveFilter, setErpActiveFilter] = useState<string | null>(null);
  const erpFilterRef = useRef<HTMLDivElement>(null);
  const erpThRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [expandedPais, setExpandedPais] = useState<Set<string>>(new Set());
  const [matrizSortCol, setMatrizSortCol] = useState<'pai' | 'total' | 'pct'>('total');
  const [matrizSortDir, setMatrizSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupByPedido, setGroupByPedido] = useState(false);
  const [isPivoted, setIsPivoted] = useState(false);

  React.useEffect(() => {
    if (externalCanal) { setCanal(externalCanal); setPage(1); setColFilters({}); setIsPivoted(false); }
  }, [externalCanal]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node))
        setCalendarOpen(false);
      if (erpFilterRef.current && !erpFilterRef.current.contains(e.target as Node))
        setErpActiveFilter(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rawData = useMemo((): any[] => {
    if (canal === 'TODOS') return CANAIS.flatMap(c => getAllChannelData(c));
    return getAllChannelData(canal);
  }, [canal, files, getAllChannelData]);

  const PIVOT_CHANNELS = ['SHOPEE', 'SHEIN'];
  const canPivot = PIVOT_CHANNELS.includes(canal);

  const pivotedData = useMemo((): any[] => {
    if (!isPivoted || !canPivot) return [];
    const data = rawData;
    if (!data.length) return [];
    if (canal === 'SHOPEE') {
      const PIVOT_COLS = [
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
      const POSITIVE_COLS = new Set(['Taxa de envio pagas pelo comprador']);
      const result: any[] = [];
      data.forEach((row: any) => {
        const status = String(row['Status do pedido'] || '').toLowerCase();
        if (status.includes('cancelado')) return;
        PIVOT_COLS.forEach(col => {
          const colKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
          if (!colKey) return;
          const rawCell = String(row[colKey] || '0');
          const vStr = rawCell.includes(',') ? rawCell.replace(/\./g, '').replace(',', '.') : rawCell;
          let valor = parseFloat(vStr) || 0;
          if (valor === 0) return;
          valor = POSITIVE_COLS.has(col) ? Math.abs(valor) : -Math.abs(valor);
          result.push({
            'Data de criação do pedido': row['Data de criação do pedido'],
            'ID do pedido': row['ID do pedido'],
            'Nome de usuário (comprador)': row['Nome de usuário (comprador)'],
            'Categoria': col.replace(/\s*\(\d+\)\s*/g, '').trim(),
            'Valor': valor,
          });
        });
      });
      return result;
    }
    return rawData;
  }, [rawData, isPivoted, canPivot, canal]);

  const filteredRaw = useMemo((): any[] => {
    let base = (isPivoted && canPivot) ? pivotedData : rawData;
    if (groupByPedido && canal !== 'TODOS') {
      const grouped: Record<string, any> = {};
      base.forEach((r: any) => {
        const pedido = r['Número da venda'] || r['Número do Pedido'] || r['numero_pedido'] || JSON.stringify(r).slice(0,20);
        if (!grouped[pedido]) grouped[pedido] = { ...r };
        else {
          Object.keys(r).forEach(k => {
            if (typeof r[k] === 'number' && typeof grouped[pedido][k] === 'number') {
              grouped[pedido][k] += r[k];
            }
          });
        }
      });
      base = Object.values(grouped);
    }
    if (!dateFilter.startDate && !dateFilter.endDate) return base;
    return base.filter((r: any) => {
      let dateStr = '';
      if (canal === 'MERCADO LIVRE') dateStr = formatDate(r['Data da tarifa']);
      else if (canal === 'TODOS') dateStr = r.DATA?.toString() || '';
      else {
        const dk = Object.keys(r).find(k => k.toLowerCase().includes('data'));
        if (dk) dateStr = formatDate(r[dk]);
      }
      const parts = dateStr.split('/');
      const iso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
      if (dateFilter.startDate && iso < dateFilter.startDate) return false;
      if (dateFilter.endDate && iso > dateFilter.endDate) return false;
      return true;
    });
  }, [rawData, pivotedData, isPivoted, canPivot, dateFilter, canal, groupByPedido]);

  const ML_FRETES_GRUPOS = ['Fretes'];
  const ML_TAXAS_GRUPOS = ['Taxas'];

  const stats = useMemo(() => {
    const empty = { vendas: 0, receita: 0, taxas: 0, fretes: 0, outros: 0, margemBruta: 0, margemLiquida: 0, ticketMedio: 0 };
    if (filteredRaw.length === 0) return empty;
    if (canal === 'MERCADO LIVRE') {
      const vendas = new Set(filteredRaw.map((r: any) => r['Número da venda'])).size;
      const receita = filteredRaw.reduce((a: number, r: any) => a + (Number(r['Valor da transação']) || 0), 0);
      let taxas = 0, fretes = 0, outros = 0;
      filteredRaw.forEach((r: any) => {
        const grupo = ML_GRUPO_MAP[r.Detalhe?.toString() || ''] || 'Outros';
        const val = Math.abs(Number(r['Valor da tarifa']) || 0);
        if (ML_FRETES_GRUPOS.includes(grupo)) fretes += val;
        else if (ML_TAXAS_GRUPOS.includes(grupo)) taxas += val;
        else outros += val;
      });
      const margemBruta = receita - taxas - fretes;
      const margemLiquida = margemBruta - outros;
      return { vendas, receita, taxas, fretes, outros, margemBruta, margemLiquida, ticketMedio: vendas > 0 ? receita / vendas : 0 };
    }
    if (canal === 'TODOS') {
      let vendas = 0, receita = 0, taxas = 0, fretes = 0, outros = 0;
      CANAIS.forEach(c => {
        const data = getAllChannelData(c);
        if (c === 'MERCADO LIVRE') {
          vendas += new Set(data.map((r: any) => r['Número da venda'])).size;
          receita += data.reduce((a: number, r: any) => a + (Number(r['Valor da transação']) || 0), 0);
          data.forEach((r: any) => {
            const grupo = ML_GRUPO_MAP[r.Detalhe?.toString() || ''] || 'Outros';
            const val = Math.abs(Number(r['Valor da tarifa']) || 0);
            if (ML_FRETES_GRUPOS.includes(grupo)) fretes += val;
            else if (ML_TAXAS_GRUPOS.includes(grupo)) taxas += val;
            else outros += val;
          });
        } else {
          vendas += data.length;
          receita += data.reduce((a: number, r: any) => {
            const keys = Object.keys(r).filter(k => typeof r[k] === 'number' && r[k] > 0);
            return keys.length > 0 ? a + (Number(r[keys[0]]) || 0) : a;
          }, 0);
        }
      });
      const margemBruta = receita - taxas - fretes;
      const margemLiquida = margemBruta - outros;
      return { vendas, receita, taxas, fretes, outros, margemBruta, margemLiquida, ticketMedio: vendas > 0 ? receita / vendas : 0 };
    }
    const vendas = filteredRaw.length;
    const receita = filteredRaw.reduce((a: number, r: any) => {
      const keys = Object.keys(r).filter(k => typeof r[k] === 'number' && r[k] > 0);
      return keys.length > 0 ? a + (Number(r[keys[0]]) || 0) : a;
    }, 0);
    const margemBruta = receita;
    return { vendas, receita, taxas: 0, fretes: 0, outros: 0, margemBruta, margemLiquida: margemBruta, ticketMedio: vendas > 0 ? receita / vendas : 0 };
  }, [filteredRaw, canal, getAllChannelData]);

  const categoriaPaiData = useMemo(() => {
    if (canal !== 'TODOS' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const cat = r['CATEGORIA PAI']?.toString() || 'Sem categoria pai';
      map[cat] = (map[cat] || 0) + Math.abs(Number(r.VALOR) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  const categoriaData = useMemo(() => {
    if (canal !== 'TODOS' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const cat = r.CATEGORIA?.toString() || 'Sem categoria';
      map[cat] = (map[cat] || 0) + Math.abs(Number(r.VALOR) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  const grupoData = useMemo(() => {
    if (canal !== 'MERCADO LIVRE' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const grupo = ML_GRUPO_MAP[r.Detalhe?.toString() || ''] || 'Outros';
      map[grupo] = (map[grupo] || 0) + Math.abs(Number(r['Valor da tarifa']) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  const taxasDetalheData = useMemo(() => {
    if (canal !== 'MERCADO LIVRE' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const d = r.Detalhe?.toString() || 'Sem detalhe';
      map[d] = (map[d] || 0) + Math.abs(Number(r['Valor da tarifa']) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  const receitaDia = useMemo(() => {
    if (filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    if (canal === 'MERCADO LIVRE') {
      filteredRaw.forEach((r: any) => {
        const date = formatDate(r['Data da tarifa']);
        map[date] = (map[date] || 0) + (Number(r['Valor da tarifa']) || 0);
      });
    } else if (canal === 'TODOS') {
      filteredRaw.forEach((r: any) => {
        const date = r.DATA?.toString() || '';
        if (date) map[date] = (map[date] || 0) + Math.abs(Number(r.VALOR) || 0);
      });
    } else {
      return [];
    }
    return Object.entries(map)
      .map(([date, valor]) => ({ date, valor }))
      .sort((a, b) => {
        const da = new Date(a.date.split('/').reverse().join('-'));
        const db = new Date(b.date.split('/').reverse().join('-'));
        return da.getTime() - db.getTime();
      }).slice(-30);
  }, [filteredRaw, canal]);

  const matrizData = useMemo(() => {
    if (filteredRaw.length === 0) return [];
    const map: Record<string, Record<string, number>> = {};
    filteredRaw.forEach((r: any) => {
      let catPai = '', cat = '', valor = 0;
      if (canal === 'TODOS') {
        catPai = r['CATEGORIA PAI']?.toString() || 'Sem categoria pai';
        cat = r.CATEGORIA?.toString() || 'Sem categoria';
        valor = Math.abs(Number(r.VALOR) || 0);
      } else if (canal === 'MERCADO LIVRE') {
        catPai = ML_GRUPO_MAP[r.Detalhe?.toString() || ''] || 'Outros';
        cat = r.Detalhe?.toString() || 'Sem detalhe';
        valor = Math.abs(Number(r['Valor da tarifa']) || 0);
      } else {
        catPai = r['CATEGORIA PAI']?.toString() || canal;
        cat = r.CATEGORIA?.toString() || 'Sem categoria';
        const keys = Object.keys(r).filter(k => typeof r[k] === 'number' && r[k] > 0);
        valor = keys.length > 0 ? Math.abs(Number(r[keys[0]]) || 0) : 0;
      }
      if (!map[catPai]) map[catPai] = {};
      map[catPai][cat] = (map[catPai][cat] || 0) + valor;
    });
    const total = Object.values(map).reduce((a, b) => a + Object.values(b).reduce((c, d) => c + d, 0), 0);
    return Object.entries(map).map(([pai, cats]) => {
      const paiTotal = Object.values(cats).reduce((a, b) => a + b, 0);
      return {
        pai,
        total: paiTotal,
        pct: total > 0 ? ((paiTotal / total) * 100).toFixed(1) : '0',
        categorias: Object.entries(cats).map(([cat, val]) => ({
          cat, valor: val,
          pct: total > 0 ? ((val / total) * 100).toFixed(1) : '0',
        })).sort((a, b) => b.valor - a.valor),
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRaw, canal]);

  const columns = useMemo(() => filteredRaw.length > 0 ? Object.keys(filteredRaw[0]) : [], [filteredRaw]);

  React.useEffect(() => {
    setVisibleColumns(prev => {
      if (prev.length === 0 || !prev.every(c => columns.includes(c))) return columns;
      const newCols = columns.filter(c => !prev.includes(c));
      return [...prev, ...newCols];
    });
  }, [columns]);

  const displayColumns = visibleColumns.filter(c => !hiddenColumns.includes(c));

  const tableData = useMemo(() => {
    let data = [...filteredRaw];
    Object.entries(colFilters).forEach(([col, vals]) => {
      if (vals?.length) data = data.filter((r: any) => vals.includes(String(r[col] ?? '')));
    });
    if (sortCol) {
      data.sort((a: any, b: any) => {
        const va = a[sortCol], vb = b[sortCol];
        if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
        return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return data;
  }, [filteredRaw, colFilters, sortCol, sortDir]);

  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE);
  const pageData = tableData.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleColHeaderClick = (e: React.MouseEvent, col: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setActiveFilterCol(activeFilterCol === col ? null : col);
    } else {
      if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortCol(col); setSortDir('asc'); }
    }
  };

  const getColOptions = (col: string) => [...new Set(filteredRaw.map((r: any) => r[col]).filter(Boolean))].sort();

  const formatCell = (val: any, col: string) => {
    if (val == null) return '-';
    if (col && (col.toLowerCase().includes('data') || col === 'DATA')) return formatDate(val);
    if (typeof val === 'number') return val.toLocaleString('pt-BR');
    return val.toString();
  };

  const handleExport = async (type: 'png' | 'pdf') => {
    window.print();
  };

  const statCards = [
    { label: 'Vendas',        value: stats.vendas.toLocaleString('pt-BR'), icon: <ShoppingCart className="h-6 w-6 text-blue-600" /> },
    { label: 'Ticket Médio',  value: formatBRL(stats.ticketMedio),         icon: <CreditCard className="h-6 w-6 text-purple-600" /> },
    { label: 'Receita',       value: formatBRL(stats.receita),             icon: <DollarSign className="h-6 w-6 text-green-600" /> },
    { label: 'Taxas',         value: formatBRL(stats.taxas),               icon: <TrendingDown className="h-6 w-6 text-red-600" /> },
    { label: 'Fretes',        value: formatBRL(stats.fretes),              icon: <Receipt className="h-6 w-6 text-orange-600" /> },
    { label: 'Margem Bruta',  value: formatBRL(stats.margemBruta),         icon: <TrendingUp className="h-6 w-6 text-emerald-600" /> },
    { label: 'Outros',        value: formatBRL(stats.outros),              icon: <BarChart2 className="h-6 w-6 text-gray-500" /> },
    { label: 'Margem Líquida',value: formatBRL(stats.margemLiquida),       icon: <TrendingUp className="h-6 w-6 text-indigo-600" /> },
  ];

  const PieSection = ({ data, title, tooltipLabel }: { data: any[]; title: string; tooltipLabel: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {data.length > 0 ? (
        <div className="flex items-center h-64">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={false}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [formatBRL(v), tooltipLabel]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 pl-6 space-y-2 max-h-56 overflow-y-auto">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs" title={item.name}>{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-2">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
      )}
    </div>
  );

  const { getCategories, getAccounts } = useAdmin();
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      getCategories().then(setCategories).catch(console.error);
      getAccounts().then(setAccounts).catch(console.error);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('categories-updated', load);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener('categories-updated', load);
    };
  }, []);

  const erpInputData = useMemo((): any[] => {
    if (!['SHOPEE', 'SHEIN'].includes(canal)) return filteredRaw;
    if (filteredRaw.length === 0) return [];
    if (filteredRaw[0] && 'Categoria' in filteredRaw[0] && !('Status do pedido' in filteredRaw[0])) return filteredRaw;
    const PIVOT_COLS = [
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
    const POSITIVE = new Set(['Taxa de envio pagas pelo comprador']);
    const result: any[] = [];
    filteredRaw.forEach((row: any) => {
      const status = String(row['Status do pedido'] || '').toLowerCase();
      if (status.includes('cancelado')) return;
      PIVOT_COLS.forEach(col => {
        const colKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
        if (!colKey) return;
        const rawCell = String(row[colKey] || '0');
        const vStr = rawCell.includes(',') ? rawCell.replace(/\./g, '').replace(',', '.') : rawCell;
        let valor = parseFloat(vStr) || 0;
        if (valor === 0) return;
        valor = POSITIVE.has(col) ? Math.abs(valor) : -Math.abs(valor);
        result.push({
          'Data de criação do pedido': row['Data de criação do pedido'],
          'ID do pedido': row['ID do pedido'],
          'Nome de usuário (comprador)': row['Nome de usuário (comprador)'],
          'Categoria': col.replace(/\s*\(\d+\)\s*/g, '').trim(),
          'Valor': valor,
        });
      });
    });
    return result;
  }, [filteredRaw, canal]);

  const erpPreviewData = useMemo(() => {
    if (dataView !== 'erp' || !['tabela', 'matriz', 'dashboard'].includes(viewMode)) return [];
    if (!erpInputData.length) return [];

    const parseD = (v: any): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v === 'number') {
        const d = new Date(new Date(1900,0,1).getTime() + (v-1)*86400000);
        if (v > 59) d.setTime(d.getTime()-86400000);
        return d;
      }
      if (typeof v === 'string' && v.includes('/')) {
        const [dd,mm,yy] = v.split('/');
        return new Date(+yy, +mm-1, +dd);
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const dates = erpInputData
      .map((r: any) => parseD(r['Data da tarifa'] || r['Data de pagamento'] || r['Data de criação do pedido']))
      .filter((d: Date | null): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    const dataInicial = dates.length ? dates[0].toISOString().split('T')[0] : '';
    const dataFinal   = dates.length ? dates[dates.length - 1].toISOString().split('T')[0] : '';
    const dateObj     = dates.length ? dates[0] : new Date();
    const competencia = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

    const rows = convertToBling(canal, erpInputData, dataInicial, dataFinal, competencia, categories, accounts);

    return rows.map(r => ({
      'Data':               r['Data'],
      'Competência':        r['Competencia'],
      'Categoria':          r['Categoria'],
      'Observações':        r['Observacoes'],
      'Valor':              r['Valor'],
      'Cliente/Fornecedor': r['Cliente/Fornecedor'],
      'CNPJ':               r['CNPJ'],
      'Portador':           r['Portador'],
    }));
  }, [dataView, viewMode, erpInputData, canal, categories, accounts]);

  const erpMatrizData = useMemo(() => {
    if (dataView !== 'erp' || viewMode !== 'matriz') return [];
    if (!erpPreviewData.length) return [];

    const groups: Record<string, any> = {};
    let total = 0;

    erpPreviewData.forEach((row: any) => {
      const obs = row['Observações'] || '';
      const cat = row['Categoria'] || 'Sem categoria';
      const parts = obs.split(' | ');
      const catPart = parts[2] || cat;
      const [pai, catName] = catPart.includes(' > ')
        ? catPart.split(' > ').map((s: string) => s.trim())
        : ['Sem categoria pai', catPart.trim()];

      const valor = Number(String(row['Valor'] || '0').replace(',', '.')) || 0;
      total += Math.abs(valor);

      const key = pai + '|||' + catName;
      if (!groups[key]) groups[key] = { cat: catName, obs: [], valor: 0, count: 0 };
      groups[key].valor += valor;
      groups[key].count++;
      if (groups[key].obs.length < 3) groups[key].obs.push(row['Observações'] || '');
    });

    const paiGroups: Record<string, { pai: string; total: number; categorias: any[] }> = {};
    Object.entries(groups).forEach(([key, g]) => {
      const [pai] = key.split('|||');
      if (!paiGroups[pai]) paiGroups[pai] = { pai, total: 0, categorias: [] };
      paiGroups[pai].total += g.valor;
      paiGroups[pai].categorias.push({
        cat: g.cat,
        obs: g.obs || [],
        valor: g.valor,
        pct: total > 0 ? (Math.abs(g.valor) / total * 100).toFixed(1) : '0.0',
      });
    });

    return Object.values(paiGroups)
      .map(p => ({
        ...p,
        pct: total > 0 ? (Math.abs(p.total) / total * 100).toFixed(1) : '0.0',
        categorias: p.categorias.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)),
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [dataView, viewMode, erpPreviewData]);

  const erpDashboardData = useMemo(() => {
    if (dataView !== 'erp' || viewMode !== 'dashboard') return { byPai: [], byCat: [], total: 0 };
    if (!erpPreviewData.length) return { byPai: [], byCat: [], total: 0 };

    const paiMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};
    let total = 0;

    erpPreviewData.forEach((row: any) => {
      const obs = row['Observações'] || '';
      const cat = row['Categoria'] || 'Sem categoria';
      const parts = obs.split(' | ');
      const catPart = parts[2] || cat;
      const [pai, catName] = catPart.includes(' > ')
        ? catPart.split(' > ').map((s: string) => s.trim())
        : ['Sem categoria pai', catPart.trim()];
      const valor = Math.abs(Number(String(row['Valor'] || '0').replace(',', '.')) || 0);
      total += valor;
      paiMap[pai] = (paiMap[pai] || 0) + valor;
      catMap[catName] = (catMap[catName] || 0) + valor;
    });

    const sort = (m: Record<string, number>) =>
      Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { byPai: sort(paiMap), byCat: sort(catMap), total };
  }, [dataView, viewMode, erpPreviewData]);

  const erpStatCards = useMemo(() => {
    if (!erpPreviewData.length) return [];
    const vals = erpPreviewData.map((r: any) => Math.abs(Number(String(r['Valor']||'0').replace(',','.')) || 0));
    const total = vals.reduce((s: number, v: number) => s + v, 0);
    const count = vals.length;
    const cats = new Set(erpPreviewData.map((r: any) => r['Categoria']).filter(Boolean)).size;
    const ports = new Set(erpPreviewData.map((r: any) => r['Portador']).filter(Boolean)).size;
    const media = count > 0 ? total / count : 0;
    const maior = vals.length ? Math.max(...vals) : 0;
    const menor = vals.length ? Math.min(...vals) : 0;
    const clientes = new Set(erpPreviewData.map((r: any) => r['Cliente/Fornecedor']).filter(Boolean)).size;
    const iconCls = 'w-8 h-8 p-1.5 rounded-lg';
    return [
      { label: 'Total Débitos',    value: formatBRL(total),         icon: <TrendingDown className={iconCls + ' bg-red-50 text-red-500'} /> },
      { label: 'Registros',        value: count.toLocaleString(),   icon: <Receipt className={iconCls + ' bg-purple-50 text-purple-500'} /> },
      { label: 'Categorias',       value: cats.toString(),          icon: <ShoppingCart className={iconCls + ' bg-orange-50 text-orange-500'} /> },
      { label: 'Portadores',       value: ports.toString(),         icon: <CreditCard className={iconCls + ' bg-teal-50 text-teal-500'} /> },
      { label: 'Clientes/Forn.',   value: clientes.toString(),      icon: <DollarSign className={iconCls + ' bg-blue-50 text-blue-500'} /> },
      { label: 'Média/Lançamento', value: formatBRL(media),         icon: <TrendingUp className={iconCls + ' bg-green-50 text-green-500'} /> },
      { label: 'Maior Débito',     value: formatBRL(maior),         icon: <TrendingDown className={iconCls + ' bg-red-50 text-red-400'} /> },
      { label: 'Menor Débito',     value: formatBRL(menor),         icon: <TrendingUp className={iconCls + ' bg-green-50 text-green-400'} /> },
    ];
  }, [erpPreviewData]);

  const erpReceitaDia = useMemo(() => {
    if (!erpPreviewData.length) return [];
    const map: Record<string, number> = {};
    erpPreviewData.forEach((r: any) => {
      const d = r['Data'] || '';
      const v = Math.abs(Number(String(r['Valor']||'0').replace(',','.')) || 0);
      map[d] = (map[d] || 0) + v;
    });
    return Object.entries(map).map(([date, valor]) => ({ date, valor }))
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya,ma-1,da).getTime() - new Date(yb,mb-1,db).getTime();
      });
  }, [erpPreviewData]);

  const ERP_COLS = ['Data', 'Competência', 'Categoria', 'Observações', 'Valor', 'Cliente/Fornecedor', 'CNPJ', 'Portador'];

  const erpDisplayData = useMemo(() => {
    let data = [...erpPreviewData];
    Object.entries(erpColFilters).forEach(([k, vals]) => {
      if (vals?.length) data = data.filter(r => vals.includes(String(r[k] ?? '')));
    });
    if (erpSortCol) {
      data.sort((a, b) => {
        const av = String(a[erpSortCol] ?? ''), bv = String(b[erpSortCol] ?? '');
        return erpSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return data;
  }, [erpPreviewData, erpColFilters, erpSortCol, erpSortDir]);

  // btn classes
  const btnBase = 'w-8 h-8 flex items-center justify-center rounded border transition-colors flex-shrink-0';
  const btnActive = btnBase + ' bg-blue-600 text-white border-blue-600';
  const btnInactive = btnBase + ' text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800';
  const btnDisabled = btnBase + ' bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-600 cursor-not-allowed';

  return (
    <div className="h-full flex flex-col relative">
      {/* Subheader */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* CANAL | APP | ERP */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
            <button onClick={() => handleSetDataView('canal')}
              className={'w-16 py-1.5 text-xs font-semibold transition-colors text-center border-r border-gray-200 dark:border-gray-700 ' + (dataView === 'canal' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}>
              CANAL
            </button>
            <button disabled className="w-16 py-1.5 text-xs font-semibold text-center border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed">
              APP
            </button>
            <button onClick={() => handleSetDataView('erp')}
              className={'w-16 py-1.5 text-xs font-semibold transition-colors text-center ' + (dataView === 'erp' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}>
              ERP
            </button>
          </div>

          {/* Contador */}
          {viewMode === 'tabela' && tableData.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{tableData.length.toLocaleString('pt-BR')} registros</span>
          )}

          <div className="flex-1" />

          {/* Botões direita — todos w-8 h-8 */}
          <div className="flex items-center gap-1.5">
            {/* Filter badges — à esquerda do # */}
            {dataView === 'canal' && Object.entries(colFilters).filter(([,v]) => v?.length).map(([col, vals]) => (
              <span key={col} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium flex-shrink-0">
                {col}: {vals.join(', ')}
                <button onClick={() => setColFilters(f => { const n = {...f}; delete n[col]; return n; })} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
            {dataView === 'erp' && Object.entries(erpColFilters).filter(([,v]) => v?.length).map(([col, vals]) => (
              <span key={col} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium flex-shrink-0">
                {col}: {vals.join(', ')}
                <button onClick={() => setErpColFilters(f => { const n = {...f}; delete n[col]; return n; })} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
            {/* # Agrupar */}
            <button onClick={() => setGroupByPedido(g => !g)} title="Agrupar por número de pedido"
              className={btnBase + ' text-xs font-bold ' + (groupByPedido ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}>
              #
            </button>

            {/* Data */}
            <div className="relative flex-shrink-0" ref={calendarRef}>
              <button onClick={() => setCalendarOpen(o => !o)} title="Filtrar por data"
                className={(dateFilter.startDate || dateFilter.endDate) ? btnActive : btnInactive}>
                <Calendar className="w-4 h-4" />
              </button>
              {calendarOpen && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <DateRangePicker
                    startDate={dateFilter.startDate}
                    endDate={dateFilter.endDate}
                    onChange={(s, e) => setDateFilter({ startDate: s, endDate: e })}
                    onClose={() => setCalendarOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Colunas */}
            <button onClick={() => viewMode === 'tabela' && setColSelectorOpen(o => !o)} disabled={viewMode !== 'tabela'}
              title={viewMode === 'tabela' ? 'Selecionar colunas' : 'Disponível apenas no modo Tabela'}
              className={viewMode !== 'tabela' ? btnDisabled : colSelectorOpen ? btnActive : btnInactive}>
              <Filter className="w-4 h-4" />
            </button>

            {/* Pivotar — sempre visível, inativo fora de Shopee/Shein canal */}
            <button
              onClick={() => canPivot && dataView === 'canal' && setIsPivoted(p => !p)}
              disabled={!canPivot || dataView !== 'canal'}
              title={!canPivot ? 'Disponível apenas para Shopee/Shein' : dataView !== 'canal' ? 'Disponível apenas no modo Canal' : isPivoted ? 'Ver dados originais' : 'Ver dados pivotados'}
              className={btnBase + ' text-sm font-bold ' + (!canPivot || dataView !== 'canal' ? 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-600 cursor-not-allowed' : isPivoted ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}>
              ⇄
            </button>

            {/* TABELA | MATRIZ | DASHBOARD */}
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
              {(['tabela', 'matriz', 'dashboard'] as ViewMode[]).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={'w-24 py-1.5 text-xs font-semibold text-center ' + (viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}>
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Export */}
            <button onClick={() => viewMode === 'dashboard' && setExportPanelOpen(true)} disabled={viewMode !== 'dashboard'}
              title={viewMode === 'dashboard' ? 'Exportar dashboard' : 'Disponível apenas no modo Dashboard'}
              className={'w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ' + (viewMode === 'dashboard' ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed')}>
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">

        {/* ERP DASHBOARD */}
        {viewMode === 'dashboard' && dataView === 'erp' && (
          <div ref={dashboardRef} className="h-full overflow-auto p-6 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mb-6">
              {erpStatCards.map(card => (
                <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">{card.icon}</div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {erpPreviewData.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Sem dados ERP para {canal}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">Selecione um canal e mude para o modo ERP</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {erpDashboardData.byPai.length > 0 && <PieSection data={erpDashboardData.byPai} title="Distribuição por Categoria Pai" tooltipLabel="Valor" />}
                  {erpDashboardData.byCat.length > 0 && <PieSection data={erpDashboardData.byCat} title="Distribuição por Categoria" tooltipLabel="Valor" />}
                </div>
                {erpReceitaDia.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lançamentos por Dia</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={erpReceitaDia} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} fontSize={12} />
                          <YAxis />
                          <Tooltip formatter={(v: any) => [formatBRL(v), 'Valor']} labelFormatter={(l: any) => `Data: ${l}`} />
                          <Bar dataKey="valor" fill="#16a34a" name="Valor" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CANAL DASHBOARD */}
        {viewMode === 'dashboard' && dataView === 'canal' && (
          <div ref={dashboardRef} className="h-full overflow-auto p-6 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mb-6">
              {statCards.map(card => (
                <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">{card.icon}</div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {rawData.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado para {canal}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">Importe arquivos na seção de Importação</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {canal === 'TODOS' && (
                    <>
                      {categoriaPaiData.length > 0 && <PieSection data={categoriaPaiData} title="Distribuição por Categoria Pai" tooltipLabel="Valor" />}
                      {categoriaData.length > 0 && <PieSection data={categoriaData} title="Distribuição por Categoria" tooltipLabel="Valor" />}
                    </>
                  )}
                  {canal === 'MERCADO LIVRE' && (
                    <>
                      {grupoData.length > 0 && <PieSection data={grupoData} title="Distribuição por Grupo" tooltipLabel="Valor da Tarifa" />}
                      {taxasDetalheData.length > 0 && <PieSection data={taxasDetalheData} title="Distribuição de Taxas por Detalhe" tooltipLabel="Valor da Tarifa" />}
                    </>
                  )}
                </div>
                {receitaDia.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receita por Dia</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={receitaDia} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} fontSize={12} />
                          <YAxis />
                          <Tooltip formatter={(v: any) => [formatBRL(v), 'Receita']} labelFormatter={(l: any) => `Data: ${l}`} />
                          <Bar dataKey="valor" fill="#3B82F6" name="Receita" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TABELA */}
        {viewMode === 'tabela' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto" style={{ overflowX: 'auto' }}>
              {dataView === 'erp' ? (
                erpPreviewData.length === 0 ? (
                  <div className="p-12 text-center">
                    <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Sem preview ERP para {canal}</p>
                    <p className="text-gray-400 dark:text-gray-500 mt-2">Verifique se o canal tem conversão implementada</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        {ERP_COLS.map(col => {
                          const hasFilter = !!erpColFilters[col];
                          const px = ['Data','Competência'].includes(col) ? 'px-3' : 'px-6';
                          return (
                            <th key={col}
                              ref={el => { erpThRefs.current[col] = el as HTMLTableCellElement; }}
                              onClick={e => {
                                if (e.ctrlKey || e.metaKey) { e.preventDefault(); setErpActiveFilter(prev => prev === col ? null : col); }
                                else { if (erpSortCol === col) setErpSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setErpSortCol(col); setErpSortDir('asc'); } }
                              }}
                              className={px + ' py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ' + (hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-600 text-white hover:bg-green-700')}>
                              <div className="flex items-center gap-1">
                                {col}
                                {erpSortCol === col && (erpSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                {hasFilter && <Filter className="w-3 h-3" />}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {erpDisplayData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                          {ERP_COLS.map(col => (
                            <td key={col} className={(['Data','Competência'].includes(col) ? 'px-3' : 'px-6') + ' py-3 text-sm text-gray-900 dark:text-gray-100 ' + (col === 'Observações' ? 'break-words max-w-xs whitespace-normal' : 'whitespace-nowrap')}>
                              {row[col] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : filteredRaw.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado para {canal}</p>
                  <p className="text-gray-400 dark:text-gray-500 mt-2">Importe arquivos na seção de Importação</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      {displayColumns.map(col => {
                        const hasFilter = !!colFilters[col];
                        return (
                          <th ref={el => { thRefs.current[col] = el as HTMLTableCellElement; }} key={col}
                            className={'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none transition-colors whitespace-nowrap ' + (hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600')}
                            onClick={e => handleColHeaderClick(e, col)}>
                            <div className="flex items-center gap-1">
                              {col}
                              {sortCol === col && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                              {hasFilter && <Filter className="w-3 h-3" />}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {pageData.map((row: any, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        {displayColumns.map(col => (
                          <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatCell(row[col], col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {erpActiveFilter && (() => {
              const anchorRef = { current: erpThRefs.current[erpActiveFilter] } as React.RefObject<HTMLElement>;
              return (
                <ColumnFilter column={erpActiveFilter} label={erpActiveFilter}
                  options={[...new Set(erpPreviewData.map((r: any) => String(r[erpActiveFilter] ?? '')).filter(Boolean))].sort()}
                  selected={erpColFilters[erpActiveFilter] || []}
                  onChange={vals => setErpColFilters(f => ({ ...f, [erpActiveFilter!]: vals }))}
                  onClose={() => setErpActiveFilter(null)} anchorRef={anchorRef} />
              );
            })()}

            {totalPages > 1 && (
              <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, tableData.length)} de {tableData.length}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">‹</button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">›</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">»</button>
                </div>
              </div>
            )}

            {activeFilterCol && (() => {
              const anchorRef = { current: thRefs.current[activeFilterCol] } as React.RefObject<HTMLElement>;
              return (
                <ColumnFilter column={activeFilterCol} label={activeFilterCol}
                  options={getColOptions(activeFilterCol).map(String)}
                  selected={colFilters[activeFilterCol] || []}
                  onChange={vals => setColFilters(f => ({ ...f, [activeFilterCol!]: vals }))}
                  onClose={() => setActiveFilterCol(null)} anchorRef={anchorRef} />
              );
            })()}

            {colSelectorOpen && (
              <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Colunas</span>
                  <button onClick={() => setColSelectorOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {visibleColumns.map((col, idx) => (
                    <div key={col} draggable
                      onDragStart={() => setDragColIdx(idx)}
                      onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDrop={() => {
                        if (dragColIdx === null) return;
                        const next = [...visibleColumns];
                        const [moved] = next.splice(dragColIdx, 1);
                        next.splice(idx, 0, moved);
                        setVisibleColumns(next);
                        setDragColIdx(null); setDragOverIdx(null);
                      }}
                      className={'flex items-center gap-2 px-2 py-2 rounded cursor-grab select-none text-sm transition-colors ' + (dragOverIdx === idx ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700')}>
                      <span className="text-gray-400 cursor-grab">⠿</span>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="checkbox" checked={hiddenColumns.indexOf(col) === -1}
                          onChange={e => { if (e.target.checked) setHiddenColumns(h => h.filter(c => c !== col)); else setHiddenColumns(h => [...h, col]); }}
                          className="rounded" />
                        <span className="text-gray-700 dark:text-gray-300 truncate">{col}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={() => { setHiddenColumns([]); setVisibleColumns(columns); }} className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Mostrar todas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MATRIZ ERP */}
        {viewMode === 'matriz' && dataView === 'erp' && (
          <div className="h-full overflow-auto">
            {erpMatrizData.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Sem dados ERP para agrupar</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-green-600 sticky top-0 z-10">
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-1/2">Categoria Pai / Categoria</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-1/4">Valor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-1/4">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {erpMatrizData.map(pai => {
                    const isExpanded = expandedPais.has(pai.pai);
                    return (
                      <React.Fragment key={pai.pai}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => setExpandedPais(prev => { const n = new Set(prev); if (n.has(pai.pai)) n.delete(pai.pai); else n.add(pai.pai); return n; })}>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-green-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{pai.pai}</span>
                              <span className="text-xs text-gray-400 ml-1">({pai.categorias.length})</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{formatBRL(pai.total)}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(pai.pct))}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400 w-10 text-right">{pai.pct}%</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && pai.categorias.map((cat: any) => (
                          <React.Fragment key={cat.cat}>
                            <tr className="hover:bg-green-50/30 dark:hover:bg-green-900/10 cursor-pointer"
                              onClick={() => setExpandedPais(prev => { const n = new Set(prev); const k = pai.pai+'|||'+cat.cat; if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
                              <td className="px-6 py-2.5 pl-10">
                                <div className="flex items-center gap-2">
                                  {expandedPais.has(pai.pai+'|||'+cat.cat) ? <ChevronDown className="w-3 h-3 text-green-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat.cat}</span>
                                </div>
                              </td>
                              <td className="px-6 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">{formatBRL(cat.valor)}</td>
                              <td className="px-6 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-300 rounded-full" style={{ width: `${Math.min(100, parseFloat(cat.pct))}%` }} />
                                  </div>
                                  <span className="text-sm text-gray-500 dark:text-gray-400 w-10 text-right">{cat.pct}%</span>
                                </div>
                              </td>
                            </tr>
                            {expandedPais.has(pai.pai+'|||'+cat.cat) && (cat.obs || []).map((ob: string, oi: number) => (
                              <tr key={oi} className="bg-gray-50/50 dark:bg-gray-700/30">
                                <td colSpan={3} className="px-6 py-1.5 pl-20 text-xs text-gray-500 dark:text-gray-400">{ob}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* MATRIZ CANAL */}
        {viewMode === 'matriz' && dataView === 'canal' && (
          <div className="h-full overflow-auto">
            {matrizData.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Sem dados para montar a matriz</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <th onClick={() => { setMatrizSortCol('pai'); setMatrizSortDir(d => matrizSortCol === 'pai' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Categoria Pai / Categoria {matrizSortCol === 'pai' ? (matrizSortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => { setMatrizSortCol('total'); setMatrizSortDir(d => matrizSortCol === 'total' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }} className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Valor {matrizSortCol === 'total' ? (matrizSortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => { setMatrizSortCol('pct'); setMatrizSortDir(d => matrizSortCol === 'pct' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }} className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">% {matrizSortCol === 'pct' ? (matrizSortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...matrizData].sort((a, b) => {
                    const mul = matrizSortDir === 'asc' ? 1 : -1;
                    if (matrizSortCol === 'pai') return mul * a.pai.localeCompare(b.pai);
                    if (matrizSortCol === 'total') return mul * (a.total - b.total);
                    return mul * (parseFloat(a.pct) - parseFloat(b.pct));
                  }).map(pai => {
                    const isExpanded = expandedPais.has(pai.pai);
                    return (
                      <React.Fragment key={pai.pai}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => setExpandedPais(prev => { const next = new Set(prev); if (next.has(pai.pai)) next.delete(pai.pai); else next.add(pai.pai); return next; })}>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{pai.pai}</span>
                              <span className="text-xs text-gray-400 ml-1">({pai.categorias.length})</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{formatBRL(pai.total)}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatBRL(pai.total)}</span>
                              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(pai.pct))}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 w-8 text-right">{pai.pct}%</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && pai.categorias.map(cat => (
                          <tr key={cat.cat} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                            <td className="px-6 py-2.5 pl-14">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{cat.cat}</span>
                            </td>
                            <td className="px-6 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">{formatBRL(cat.valor)}</td>
                            <td className="px-6 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-300 rounded-full" style={{ width: `${Math.min(100, parseFloat(cat.pct))}%` }} />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400 w-10 text-right">{cat.pct}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* Export side panel */}
      {exportPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setExportPanelOpen(false)} />
          <div className="fixed right-0 top-14 bottom-8 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Exportar Dashboard</h3>
              <button onClick={() => setExportPanelOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Exporte a visualização atual do dashboard.</p>
              <button onClick={() => handleExport('png')} className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-300">Exportar como PNG</div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Imagem de alta qualidade</div>
                </div>
              </button>
              <button onClick={() => handleExport('pdf')} className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                <Download className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-red-900 dark:text-red-300">Exportar como PDF</div>
                  <div className="text-xs text-red-600/70 dark:text-red-400/70">Documento para impressão</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
