import React, { useState, useMemo, useRef, useCallback } from 'react';
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

// ── helpers ──────────────────────────────────────────────────────────────────
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
  "Cancelamento da tarifa de devolução por envio externo ou intermunicipal": "Cancelamentos de tarifas",
  "Cancelamento da tarifa de manutenção da Minha página": "Cancelamentos de tarifas",
  "Cancelamento da tarifa de venda": "Cancelamentos de tarifas",
  "Cancelamento da tarifa por campanhas de publicidade - Product Ads": "Cancelamentos de tarifas",
  "Cancelamento da tarifa por devolução": "Cancelamentos de tarifas",
  "Cancelamento da tarifa por envio interno ao município": "Cancelamentos de tarifas",
  "Cancelamento da tarifa por serviço de armazenamento Full": "Cancelamentos de tarifas",
  "Cancelamento da tarifa por serviço de coleta Full": "Cancelamentos de tarifas",
  "Estorno da tarifa de manutenção do eShop": "Cancelamentos de tarifas",
  "Estorno da tarifa de venda": "Cancelamentos de tarifas",
  "Estorno do custo de envio externo ou inter municipal": "Cancelamentos de tarifas",
  "Estorno do custo de gestão da venda": "Cancelamentos de tarifas",
  "Estorno do custo de Mercado Envios": "Cancelamentos de tarifas",
  "Tarifa de devolução": "Tarifa do Mercado Envios",
  "Tarifa de devolução por envio externo ou intermunicipal": "Tarifa do Mercado Envios",
  "Tarifa de devolução por envio interno no município": "Tarifa do Mercado Envios",
  "Tarifa de envio extra ou intermunicipal": "Tarifa do Mercado Envios",
  "Tarifa de envio interno à cidade": "Tarifa do Mercado Envios",
  "Tarifa do Mercado Envios": "Tarifa do Mercado Envios",
  "Tarifa por envio interno ao município": "Tarifa do Mercado Envios",
  "Tarifa de manutenção da Minha página": "Tarifas da Minha página",
  "Custo de gestão da venda": "Tarifas de venda",
  "Custo por inconformidade no Envios Full": "Tarifas de venda",
  "Tarifa de venda": "Tarifas de venda",
  "Cancelamento do custo por inconformidade no Envios Full": "Tarifas do Mercado Envios Full",
  "Custo de armazenamento prolongado no Full": "Tarifas do Mercado Envios Full",
  "Custo do serviço de coleta Full": "Tarifas do Mercado Envios Full",
  "Custo por retirada de estoque Full": "Tarifas do Mercado Envios Full",
  "Custo por retirada ou descarte de estoque Full": "Tarifas do Mercado Envios Full",
  "Tarifa pelo serviço de armazenamento": "Tarifas do Mercado Envios Full",
  "Tarifa pelo serviço de armazenamento Full": "Tarifas do Mercado Envios Full",
  "Tarifa por estoque antigo no Full": "Tarifas do Mercado Envios Full",
  "Tarifas dos serviços do Mercado Pago": "Tarifas dos serviços do Mercado Pago",
  "Campanhas de publicidade - Product Ads": "Tarifas por campanha de publicidade",
  "Tarifa por campanha de publicidade no Google Ads pelo Mercado Shops": "Tarifas por campanha de publicidade",
  "Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Taxas de parcelamento",
  "Taxas de parcelamento": "Taxas de parcelamento",
  "Cancelamento da Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Outros",
  "Tarifa de manutenção do eShop": "Outros",
};

type ViewMode = 'dashboard' | 'tabela' | 'matriz';

interface DadosProps {
  selectedCanal?: string;
}

export const Dados: React.FC<DadosProps> = ({ selectedCanal: externalCanal }) => {
  const { files, getAllChannelData } = useFileData();
  const [canal, setCanal] = useState<string>(externalCanal || 'TODOS');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Table state
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Matriz state
  const [expandedPais, setExpandedPais] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (externalCanal) { setCanal(externalCanal); setPage(1); setColFilters({}); }
  }, [externalCanal]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setActiveFilterCol(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rawData = useMemo((): any[] => {
    if (canal === 'TODOS') return CANAIS.flatMap(c => getAllChannelData(c));
    return getAllChannelData(canal);
  }, [canal, files, getAllChannelData]);

  const filteredRaw = useMemo((): any[] => {
    if (!dateFilter.startDate && !dateFilter.endDate) return rawData;
    return rawData.filter((r: any) => {
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
  }, [rawData, dateFilter, canal]);

  // Stats
  const stats = useMemo(() => {
    const empty = { vendas: 0, receita: 0, taxas: 0, lucro: 0, ticketMedio: 0, impostos: 0, lucroBruto: 0 };
    if (filteredRaw.length === 0) return empty;
    if (canal === 'MERCADO LIVRE') {
      const vendas = new Set(filteredRaw.map((r: any) => r['Número da venda'])).size;
      const receita = filteredRaw.reduce((a: number, r: any) => a + (Number(r['Valor da transação']) || 0), 0);
      const taxas = filteredRaw.reduce((a: number, r: any) => a + (Number(r['Valor da tarifa']) || 0), 0);
      const lucro = receita - taxas;
      const impostos = receita * 0.1;
      return { vendas, receita, taxas, lucro, ticketMedio: vendas > 0 ? receita / vendas : 0, impostos, lucroBruto: lucro - impostos };
    }
    if (canal === 'TODOS') {
      let vendas = 0, receita = 0, taxas = 0;
      CANAIS.forEach(c => {
        const data = getAllChannelData(c);
        if (c === 'MERCADO LIVRE') {
          vendas += new Set(data.map((r: any) => r['Número da venda'])).size;
          receita += data.reduce((a: number, r: any) => a + (Number(r['Valor da transação']) || 0), 0);
          taxas += data.reduce((a: number, r: any) => a + (Number(r['Valor da tarifa']) || 0), 0);
        } else {
          vendas += data.length;
          receita += data.reduce((a: number, r: any) => {
            const keys = Object.keys(r).filter(k => typeof r[k] === 'number' && r[k] > 0);
            return keys.length > 0 ? a + (Number(r[keys[0]]) || 0) : a;
          }, 0);
        }
      });
      const lucro = receita - taxas;
      const impostos = receita * 0.1;
      return { vendas, receita, taxas, lucro, ticketMedio: vendas > 0 ? receita / vendas : 0, impostos, lucroBruto: lucro - impostos };
    }
    const vendas = filteredRaw.length;
    const receita = filteredRaw.reduce((a: number, r: any) => {
      const keys = Object.keys(r).filter(k => typeof r[k] === 'number' && r[k] > 0);
      return keys.length > 0 ? a + (Number(r[keys[0]]) || 0) : a;
    }, 0);
    const impostos = receita * 0.1;
    return { vendas, receita, taxas: 0, lucro: receita, ticketMedio: vendas > 0 ? receita / vendas : 0, impostos, lucroBruto: receita - impostos };
  }, [filteredRaw, canal, getAllChannelData]);

  // Pie data
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
    } else return [];
    return Object.entries(map)
      .map(([date, valor]) => ({ date, valor }))
      .sort((a, b) => {
        const da = new Date(a.date.split('/').reverse().join('-'));
        const db = new Date(b.date.split('/').reverse().join('-'));
        return da.getTime() - db.getTime();
      }).slice(-30);
  }, [filteredRaw, canal]);

  // Matriz data
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
          cat,
          valor: val,
          pct: total > 0 ? ((val / total) * 100).toFixed(1) : '0',
        })).sort((a, b) => b.valor - a.valor),
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRaw, canal]);

  // Table data
  const columns = useMemo(() => filteredRaw.length > 0 ? Object.keys(filteredRaw[0]) : [], [filteredRaw]);

  const tableData = useMemo(() => {
    let data = [...filteredRaw];
    Object.entries(colFilters).forEach(([col, val]) => {
      if (val) data = data.filter((r: any) => r[col]?.toString().toLowerCase().includes(val.toLowerCase()));
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

  // Export as image/PDF
  const handleExport = async (type: 'png' | 'pdf') => {
    const el = dashboardRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js' as any)).default;
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
      if (type === 'png') {
        const a = document.createElement('a');
        a.download = `feex-dashboard-${canal}-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      } else {
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.esm.min.js' as any);
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`feex-dashboard-${canal}-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
      }
    } catch (err) {
      // Fallback: open print dialog
      window.print();
    }
  };

  const statCards = [
    { label: 'Vendas',      value: stats.vendas.toLocaleString('pt-BR'), icon: <ShoppingCart className="h-6 w-6 text-blue-600" /> },
    { label: 'Ticket Médio',value: formatBRL(stats.ticketMedio),         icon: <CreditCard className="h-6 w-6 text-purple-600" /> },
    { label: 'Receita',     value: formatBRL(stats.receita),             icon: <DollarSign className="h-6 w-6 text-green-600" /> },
    { label: 'Taxas',       value: formatBRL(stats.taxas),               icon: <TrendingDown className="h-6 w-6 text-red-600" /> },
    { label: 'Lucro',       value: formatBRL(stats.lucro),               icon: <TrendingUp className="h-6 w-6 text-indigo-600" /> },
    { label: 'Impostos',    value: formatBRL(stats.impostos),            icon: <Receipt className="h-6 w-6 text-orange-600" /> },
    { label: 'Lucro Bruto', value: formatBRL(stats.lucroBruto),          icon: <BarChart2 className="h-6 w-6 text-emerald-600" /> },
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

  return (
    <div className="h-full flex flex-col relative">
      {/* Subheader */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visualização de Dados</h2>
            {/* View mode tabs */}
            <div className="flex items-center gap-1">
              {(['tabela', 'matriz', 'dashboard'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
              {/* Export panel trigger — only in dashboard */}
              {viewMode === 'dashboard' && (
                <button
                  onClick={() => setExportPanelOpen(true)}
                  className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  title="Exportar dashboard"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={e => setDateFilter(f => ({ ...f, startDate: e.target.value }))}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500">até</span>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={e => setDateFilter(f => ({ ...f, endDate: e.target.value }))}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {(dateFilter.startDate || dateFilter.endDate) && (
              <button onClick={() => setDateFilter({ startDate: '', endDate: '' })} className="text-xs text-red-500 hover:text-red-700">Limpar</button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">

        {/* ── DASHBOARD ── */}
        {viewMode === 'dashboard' && (
          <div ref={dashboardRef} className="p-6 pb-20">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
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
              <>
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
              </>
            )}
          </div>
        )}

        {/* ── TABELA ── */}
        {viewMode === 'tabela' && (
          <div className="h-full flex flex-col">
            {/* Hint */}
            <div className="px-6 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Clique na coluna para ordenar &nbsp;·&nbsp; <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl</kbd> + clique para filtrar
              </p>
            </div>

            {filteredRaw.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado para {canal}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">Importe arquivos na seção de Importação</p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden relative">
                {/* Pagination top */}
                <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {(page-1)*ROWS_PER_PAGE+1} a {Math.min(page*ROWS_PER_PAGE, tableData.length)} de {tableData.length}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Anterior</button>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{page} de {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Próximo</button>
                    </div>
                  )}
                </div>

                <div className="h-full overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {columns.map(col => {
                          const hasFilter = !!colFilters[col];
                          return (
                            <th
                              key={col}
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none transition-colors whitespace-nowrap
                                ${hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                              onClick={e => handleColHeaderClick(e, col)}
                            >
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
                          {columns.map(col => (
                            <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {formatCell(row[col], col)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ctrl+click filter popup */}
                {activeFilterCol && (
                  <div ref={filterRef} className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Filtrar: {activeFilterCol}</span>
                      <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">×</button>
                    </div>
                    <select
                      autoFocus
                      value={colFilters[activeFilterCol] || ''}
                      onChange={e => setColFilters(f => ({ ...f, [activeFilterCol!]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Todos</option>
                      {getColOptions(activeFilterCol).slice(0, 50).map(v => (
                        <option key={String(v)} value={String(v)}>{String(v)}</option>
                      ))}
                    </select>
                    {colFilters[activeFilterCol] && (
                      <button onClick={() => setColFilters(f => ({ ...f, [activeFilterCol!]: '' }))} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar filtro</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MATRIZ ── */}
        {viewMode === 'matriz' && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Categoria Pai / Categoria</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Valor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {matrizData.map(pai => {
                    const isExpanded = expandedPais.has(pai.pai);
                    return (
                      <React.Fragment key={pai.pai}>
                        {/* Pai row */}
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer bg-gray-50/50 dark:bg-gray-800"
                          onClick={() => setExpandedPais(prev => {
                            const next = new Set(prev);
                            if (next.has(pai.pai)) next.delete(pai.pai);
                            else next.add(pai.pai);
                            return next;
                          })}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{pai.pai}</span>
                              <span className="text-xs text-gray-400 ml-1">({pai.categorias.length})</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{formatBRL(pai.total)}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(pai.pct))}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 w-10 text-right">{pai.pct}%</span>
                            </div>
                          </td>
                        </tr>
                        {/* Child rows */}
                        {isExpanded && pai.categorias.map(cat => (
                          <tr key={cat.cat} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 bg-white dark:bg-gray-800/50">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Exporte a visualização atual do dashboard como imagem ou PDF.</p>
              <button
                onClick={() => handleExport('png')}
                className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-300">Exportar como PNG</div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Imagem de alta qualidade</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
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
