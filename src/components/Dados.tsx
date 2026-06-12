import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, CartesianGrid, XAxis, YAxis, Bar,
} from 'recharts';
import {
  ShoppingCart, CreditCard, DollarSign, TrendingDown,
  TrendingUp, Receipt, BarChart2, Calendar, PieChart as PieIcon, Table,
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
    // Excel serial
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toLocaleDateString('pt-BR');
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('pt-BR');
}

const CANAIS = ['AMAZON', 'MAGAZINE LUIZA', 'MERCADO LIVRE', 'SHEIN', 'SHOPEE'];
const ROWS_PER_PAGE = 100;
const COLORS = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

// Grupo mapping for Mercado Livre
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
  "CANCELAMENTO DA TARIFA DE ENVIO EXTRA OU INTERMUNICIPAL": "Tarifas do Mercado Envios Full",
  "Custo de armazenamento prolongado no Full": "Tarifas do Mercado Envios Full",
  "Custo do serviço de coleta Full": "Tarifas do Mercado Envios Full",
  "Custo por retirada de estoque Full": "Tarifas do Mercado Envios Full",
  "Custo por retirada ou descarte de estoque Full": "Tarifas do Mercado Envios Full",
  "Estorno pelo serviço de coleta Full": "Tarifas do Mercado Envios Full",
  "Estorno por retirada de estoque no Full": "Tarifas do Mercado Envios Full",
  "Tarifa pelo serviço de armazenamento": "Tarifas do Mercado Envios Full",
  "Tarifa pelo serviço de armazenamento Full": "Tarifas do Mercado Envios Full",
  "Tarifa por estoque antigo no Full": "Tarifas do Mercado Envios Full",
  "Tarifas dos serviços do Mercado Pago": "Tarifas dos serviços do Mercado Pago",
  "Anulação da tarifa por campanhas de publicidade - Brand Ads": "Tarifas por campanha de publicidade",
  "Campanhas de publicidade - Product Ads": "Tarifas por campanha de publicidade",
  "Tarifa por campanha de publicidade no Google Ads pelo Mercado Shops": "Tarifas por campanha de publicidade",
  "Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Taxas de parcelamento",
  "Taxas de parcelamento": "Taxas de parcelamento",
  "Cancelamento da Taxa de parcelamento (equivalente ao acréscimo no preço pago pelo comprador)": "Outros",
  "Tarifa de manutenção do eShop": "Outros",
};

// ── Component ─────────────────────────────────────────────────────────────────
interface DadosProps {
  selectedCanal?: string;
}

export const Dados: React.FC<DadosProps> = ({ selectedCanal: externalCanal }) => {
  const { files, getAllChannelData } = useFileData();
  const [canal, setCanal] = useState<string>(externalCanal || 'TODOS');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grafico' | 'tabela'>('grafico');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Sync with header canal pill
  React.useEffect(() => {
    if (externalCanal) { setCanal(externalCanal); setPage(1); setColFilters({}); }
  }, [externalCanal]);

  // Canal tabs
  const canalTabs = useMemo(
    () => ['TODOS', ...CANAIS.filter(c => getAllChannelData(c).length > 0)],
    [files, getAllChannelData]
  );

  // Raw data for selected canal
  const rawData = useMemo((): any[] => {
    if (canal === 'TODOS') return CANAIS.flatMap(c => getAllChannelData(c));
    return getAllChannelData(canal);
  }, [canal, files, getAllChannelData]);

  // Date-filtered raw data
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
      // convert dd/mm/yyyy → yyyy-mm-dd for comparison
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
      const receita = filteredRaw.reduce((acc: number, r: any) => acc + (Number(r['Valor da transação']) || 0), 0);
      const taxas = filteredRaw.reduce((acc: number, r: any) => acc + (Number(r['Valor da tarifa']) || 0), 0);
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

  // Pie: Distribuição por Categoria Pai (TODOS only)
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

  // Pie: Distribuição por Categoria (TODOS only)
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

  // Pie: Distribuição por Grupo (MERCADO LIVRE only)
  const grupoData = useMemo(() => {
    if (canal !== 'MERCADO LIVRE' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const detalhe = r.Detalhe?.toString() || 'Sem detalhe';
      const grupo = ML_GRUPO_MAP[detalhe] || 'Outros';
      map[grupo] = (map[grupo] || 0) + Math.abs(Number(r['Valor da tarifa']) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  // Pie: Distribuição de Taxas por Detalhe (MERCADO LIVRE only)
  const taxasDetalheData = useMemo(() => {
    if (canal !== 'MERCADO LIVRE' || filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    filteredRaw.forEach((r: any) => {
      const detalhe = r.Detalhe?.toString() || 'Sem detalhe';
      map[detalhe] = (map[detalhe] || 0) + Math.abs(Number(r['Valor da tarifa']) || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRaw, canal]);

  // Bar: Receita por Dia (last 30 days)
  const receitaDia = useMemo(() => {
    if (filteredRaw.length === 0) return [];
    const map: Record<string, number> = {};
    if (canal === 'MERCADO LIVRE') {
      filteredRaw.forEach((r: any) => {
        const date = formatDate(r['Data da tarifa']);
        const val = Number(r['Valor da tarifa']) || 0;
        map[date] = (map[date] || 0) + val;
      });
    } else if (canal === 'TODOS') {
      filteredRaw.forEach((r: any) => {
        const date = r.DATA?.toString() || '';
        const val = Math.abs(Number(r.VALOR) || 0);
        if (date) map[date] = (map[date] || 0) + val;
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
      })
      .slice(-30);
  }, [filteredRaw, canal]);

  // Table: columns + filter/sort/paginate
  const columns = useMemo(() => filteredRaw.length > 0 ? Object.keys(filteredRaw[0]) : [], [filteredRaw]);

  const getColOptions = (col: string) => [...new Set(filteredRaw.map((r: any) => r[col]).filter(Boolean))].sort();

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

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const formatCell = (val: any, col: string) => {
    if (val == null) return '-';
    if (col && (col.toLowerCase().includes('data') || col === 'DATA')) return formatDate(val);
    if (typeof val === 'number') return val.toLocaleString('pt-BR');
    return val.toString();
  };

  // Stat cards config
  const statCards = [
    { label: 'Vendas',      value: stats.vendas.toLocaleString('pt-BR'), icon: <ShoppingCart className="h-6 w-6 text-blue-600" /> },
    { label: 'Ticket Médio',value: formatBRL(stats.ticketMedio),         icon: <CreditCard className="h-6 w-6 text-purple-600" /> },
    { label: 'Receita',     value: formatBRL(stats.receita),             icon: <DollarSign className="h-6 w-6 text-green-600" /> },
    { label: 'Taxas',       value: formatBRL(stats.taxas),               icon: <TrendingDown className="h-6 w-6 text-red-600" /> },
    { label: 'Lucro',       value: formatBRL(stats.lucro),               icon: <TrendingUp className="h-6 w-6 text-indigo-600" /> },
    { label: 'Impostos',    value: formatBRL(stats.impostos),            icon: <Receipt className="h-6 w-6 text-orange-600" /> },
    { label: 'Lucro Bruto', value: formatBRL(stats.lucroBruto),          icon: <BarChart2 className="h-6 w-6 text-emerald-600" /> },
  ];

  // Reusable Pie section
  const PieSection = ({ data, title, tooltipLabel }: { data: any[]; title: string; tooltipLabel: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {data.length > 0 ? (
        <div className="flex items-center h-64">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" dataKey="value" label={false}>
                  {data.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [formatBRL(v), tooltipLabel]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 pl-6">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs" title={item.name}>{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Subheader */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visualização de Dados</h2>
            <div className="flex items-center gap-1">
              {canalTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setCanal(tab); setPage(1); setColFilters({}); }}
                  className={`px-3 py-1 text-sm font-medium transition-colors duration-200 border-b-2 ${
                    canal === tab
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={e => setDateFilter(f => ({ ...f, startDate: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">até</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={e => setDateFilter(f => ({ ...f, endDate: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button onClick={() => setDateFilter({ startDate: '', endDate: '' })} className="text-xs text-red-500 hover:text-red-700">Limpar</button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('grafico')} className={`p-1.5 rounded transition-colors ${viewMode === 'grafico' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <PieIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('tabela')} className={`p-1.5 rounded transition-colors ${viewMode === 'tabela' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto pb-20">
        {/* Stat cards — 7 col grid */}
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

        {/* Grafico mode */}
        {viewMode === 'grafico' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TODOS charts */}
              {canal === 'TODOS' && (
                <>
                  {categoriaPaiData.length > 0 && <PieSection data={categoriaPaiData} title="Distribuição por Categoria Pai" tooltipLabel="Valor" />}
                  {categoriaData.length > 0 && <PieSection data={categoriaData} title="Distribuição por Categoria" tooltipLabel="Valor" />}
                </>
              )}

              {/* MERCADO LIVRE charts */}
              {canal === 'MERCADO LIVRE' && (
                <>
                  {grupoData.length > 0 && <PieSection data={grupoData} title="Distribuição por Grupo" tooltipLabel="Valor da Tarifa" />}
                  {taxasDetalheData.length > 0 && <PieSection data={taxasDetalheData} title="Distribuição de Taxas por Detalhe" tooltipLabel="Valor da Tarifa" />}
                </>
              )}
            </div>

            {/* Bar chart — Receita por Dia */}
            {receitaDia.length > 0 && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
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

            {/* Empty state */}
            {rawData.length === 0 && (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado encontrado para {canal}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">Importe arquivos na seção de Importação</p>
              </div>
            )}
          </>
        )}

        {/* Tabela mode */}
        {viewMode === 'tabela' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
            {filteredRaw.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado encontrado para {canal}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">Importe arquivos na seção de Importação</p>
              </div>
            ) : (
              <>
                {/* Pagination top */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {(page - 1) * ROWS_PER_PAGE + 1} a {Math.min(page * ROWS_PER_PAGE, tableData.length)} de {tableData.length}
                    </span>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >Anterior</button>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{page} de {totalPages}</span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >Próximo</button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {columns.map(col => (
                          <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort(col)}>
                                {col} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                              </div>
                              <select
                                value={colFilters[col] || ''}
                                onChange={e => { setColFilters(f => ({ ...f, [col]: e.target.value })); setPage(1); }}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              >
                                <option value="">Todos</option>
                                {getColOptions(col).slice(0, 50).map(v => (
                                  <option key={String(v)} value={String(v)}>{String(v)}</option>
                                ))}
                              </select>
                            </div>
                          </th>
                        ))}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
