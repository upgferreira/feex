import React, { useState, useEffect, useRef } from 'react';
import { FullscreenModal } from './FullscreenModal';
import { ColumnFilter } from './ColumnFilter';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Check, X as XIcon, ArrowUp, ArrowDown, Filter, RefreshCw } from 'lucide-react';

interface CaixasModalProps { isOpen: boolean; onClose: () => void; }

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const COLS: [string, string][] = [
  ['data',              'Data'],
  ['competencia',       'Competência'],
  ['descricao',         'Categoria'],
  ['observacoes',       'Observações'],
  ['contato_nome',      'Contato'],
  ['contato_cnpj',      'CPF/CNPJ'],
  ['contaFinanceira',   'Conta Financeira'],
  ['valor',             'Valor'],
  ['origem_tipo',       'Tipo Origem'],
  ['situacao',          'Situação'],
  ['id',                'ID Lançamento'],
  ['contaFinanceira_id','ID Conta Financeira'],
  ['contato_id',        'ID Contato'],
  ['origem_id',         'ID Origem'],
];

export const CaixasModal: React.FC<CaixasModalProps> = ({ isOpen, onClose }) => {
  const [contas, setContas]           = useState<any[]>([]);
  const [contaSel, setContaSel]       = useState<any | null>(null);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [acting, setActing]           = useState(false);

  // Table state
  const [sortCol, setSortCol]         = useState<string>('data');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [colFilters, setColFilters]   = useState<Record<string, string[]>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  // CRUD state
  const [editRow, setEditRow]         = useState<any | null>(null);
  const [addRow, setAddRow]           = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Date filters
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal]     = useState('');

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
  };

  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const loadContas = async () => {
    try {
      const h = await getHeaders();
      const res = await fetch(`${base}/bling_getContasFinanceiras`, { method: 'GET', headers: h });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setContas(json.data || []);
    } catch (e: any) { setError(e.message); }
  };

  const loadLancamentos = async (conta: any) => {
    setLoading(true); setError(null); setLancamentos([]);
    try {
      const h = await getHeaders();
      const params = new URLSearchParams({ idContaFinanceira: String(conta.id) });
      if (dataInicial) params.set('dataInicial', dataInicial);
      if (dataFinal)   params.set('dataFinal', dataFinal);
      const res = await fetch(`${base}/bling_getCaixas?${params}`, { method: 'GET', headers: h });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setLancamentos(json.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const crudAction = async (action: 'post' | 'put' | 'delete', id: string | null, body: any) => {
    setActing(true);
    try {
      const h = await getHeaders();
      let res;
      if (action === 'post') res = await fetch(`${base}/bling_postCaixas`, { method: 'POST', headers: h, body: JSON.stringify(body) });
      else if (action === 'put') res = await fetch(`${base}/bling_putCaixasID?id=${id}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
      else res = await fetch(`${base}/bling_deleteCaixasID?id=${id}`, { method: 'POST', headers: h, body: JSON.stringify({}) });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setEditRow(null); setAddRow(null); setSelectedIds(new Set());
      if (contaSel) await loadLancamentos(contaSel);
    } catch (e: any) { setError(e.message); }
    finally { setActing(false); }
  };

  useEffect(() => { if (isOpen) loadContas(); }, [isOpen]);

  const getValue = (row: any, col: string): string => {
    if (col === 'contato_nome')       return row.contato?.nome ?? '-';
    if (col === 'contato_cnpj')       return row.contato?.cnpj ?? '-';
    if (col === 'contato_id')         return String(row.contato?.id ?? '-');
    if (col === 'contaFinanceira')    return row.contaFinanceira?.descricao ?? '-';
    if (col === 'contaFinanceira_id') return String(row.contaFinanceira?.id ?? '-');
    if (col === 'origem_tipo')        return row.origem?.tipo ?? '-';
    if (col === 'origem_id')          return String(row.origem?.id ?? '-');
    if (col === 'valor')              return formatBRL(row.valor ?? 0);
    if (col === 'situacao')           return row.situacao === 'R' ? 'Registrado' : row.situacao === 'E' ? 'Excluído' : '-';
    return String(row[col] ?? '-');
  };

  const sortKey = (row: any) => {
    if (sortCol === 'valor')              return row.valor ?? 0;
    if (sortCol === 'contato_nome')       return row.contato?.nome ?? '';
    if (sortCol === 'contato_cnpj')       return row.contato?.cnpj ?? '';
    if (sortCol === 'contato_id')         return row.contato?.id ?? 0;
    if (sortCol === 'contaFinanceira')    return row.contaFinanceira?.descricao ?? '';
    if (sortCol === 'contaFinanceira_id') return row.contaFinanceira?.id ?? 0;
    if (sortCol === 'origem_tipo')        return row.origem?.tipo ?? '';
    if (sortCol === 'origem_id')          return row.origem?.id ?? 0;
    return String(row[sortCol] ?? '');
  };

  const displayed = React.useMemo(() => {
    let data = [...lancamentos];
    Object.entries(colFilters).forEach(([k, vals]) => {
      if (vals?.length) data = data.filter(r => vals.includes(getValue(r, k)));
    });
    data.sort((a, b) => {
      const av = sortKey(a), bv = sortKey(b);
      const mul = sortDir === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return mul * (av - bv);
      return mul * String(av).localeCompare(String(bv));
    });
    return data;
  }, [lancamentos, colFilters, sortCol, sortDir]);

  const handleColClick = (e: React.MouseEvent, col: string) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setActiveFilter(p => p === col ? null : col); }
    else { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } }
  };

  const toggleSel = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Caixas e Bancos (ERP)">
      {/* Toolbar */}
      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-900 flex-wrap">
        {/* Conta selector */}
        <select
          value={contaSel?.id ?? ''}
          onChange={e => {
            const c = contas.find(c => String(c.id) === e.target.value);
            setContaSel(c ?? null);
            if (c) loadLancamentos(c);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-[200px]"
        >
          <option value="">Selecione a conta...</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
        </select>

        {/* Date filters */}
        <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <button onClick={() => contaSel && loadLancamentos(contaSel)} disabled={!contaSel || loading}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-xs text-gray-400 ml-1">{displayed.length} lançamento(s) · {selectedIds.size} selecionado(s)</span>

        <div className="ml-auto flex gap-2">
          <button onClick={() => { const r = lancamentos.find(l => selectedIds.has(String(l.id))); if (r) { setAddRow(null); setEditRow({...r}); }}}
            disabled={selectedIds.size !== 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 text-gray-700 dark:text-gray-300 border-gray-300 hover:bg-gray-100 bg-white dark:bg-gray-800">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button onClick={async () => { if (!window.confirm('Excluir ' + selectedIds.size + ' lançamento(s)?')) return; for (const id of selectedIds) await crudAction('delete', id, null); }}
            disabled={selectedIds.size === 0 || acting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 text-red-600 border-red-300 hover:bg-red-50 bg-white dark:bg-gray-800">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
          <button onClick={() => { setEditRow(null); setAddRow({ data: new Date().toISOString().split('T')[0], competencia: new Date().toISOString().split('T')[0], valor: 0, debCred: 'D', contaFinanceira: { id: contaSel?.id } }); }}
            disabled={!contaSel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex-shrink-0">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!contaSel ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Selecione uma conta financeira acima</div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 sticky top-0 z-10">
                <th className="w-10 px-3 py-3" />
                {COLS.map(([key, h]) => (
                  <th key={key}
                    ref={el => { thRefs.current[key] = el as HTMLTableCellElement; }}
                    onClick={e => handleColClick(e, key)}
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap cursor-pointer select-none ${colFilters[key]?.length ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-white hover:bg-blue-700'}`}>
                    <div className="flex items-center gap-1">
                      {h}
                      {sortCol === key ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                      {colFilters[key]?.length ? <Filter className="w-3 h-3" /> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Add row */}
              {addRow && (
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td />
                  <td />
                  <td className="px-3 py-2"><input type="date" value={addRow.data} onChange={e => setAddRow((r: any) => ({...r, data: e.target.value}))} className="w-32 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /></td>
                  <td className="px-3 py-2"><input type="date" value={addRow.competencia} onChange={e => setAddRow((r: any) => ({...r, competencia: e.target.value}))} className="w-32 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /></td>
                  <td className="px-3 py-2"><select value={addRow.debCred} onChange={e => setAddRow((r: any) => ({...r, debCred: e.target.value}))} className="px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white"><option value="D">Débito</option><option value="C">Crédito</option></select></td>
                  <td className="px-3 py-2"><input type="number" value={addRow.valor} onChange={e => setAddRow((r: any) => ({...r, valor: Number(e.target.value)}))} className="w-24 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /></td>
                  <td className="px-3 py-2"><input value={addRow.descricao ?? ''} onChange={e => setAddRow((r: any) => ({...r, descricao: e.target.value}))} placeholder="Descrição" className="w-40 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /></td>
                  <td className="px-3 py-2"><input value={addRow.observacoes ?? ''} onChange={e => setAddRow((r: any) => ({...r, observacoes: e.target.value}))} placeholder="Observações" className="w-40 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /></td>
                  <td colSpan={2} />
                  <td className="px-3 py-2"><div className="flex gap-1">
                    <button onClick={() => crudAction('post', null, addRow)} disabled={acting} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setAddRow(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              )}
              {displayed.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum lançamento encontrado</td></tr>
              ) : displayed.map((row: any) => {
                const id = String(row.id);
                const isEditing = editRow?.id === row.id;
                const isDebito = row.debCred === 'D';
                return (
                  <tr key={id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-3 py-2.5 text-center" onClick={() => toggleSel(id)}>
                      <input type="checkbox" readOnly checked={selectedIds.has(id)} className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                    </td>
                    {/* DATA */}
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{isEditing ? <input type="date" value={editRow.data} onChange={e => setEditRow((r: any) => ({...r, data: e.target.value}))} className="w-32 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /> : row.data}</td>
                    {/* COMPETENCIA */}
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{isEditing ? <input type="date" value={editRow.competencia} onChange={e => setEditRow((r: any) => ({...r, competencia: e.target.value}))} className="w-32 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /> : row.competencia}</td>
                    {/* CATEGORIA (descricao) */}
                    <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">{isEditing ? <input value={editRow.descricao ?? ''} onChange={e => setEditRow((r: any) => ({...r, descricao: e.target.value}))} className="w-40 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /> : row.descricao ?? '-'}</td>
                    {/* OBSERVAÇÕES */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 max-w-xs truncate">{isEditing ? <input value={editRow.observacoes ?? ''} onChange={e => setEditRow((r: any) => ({...r, observacoes: e.target.value}))} className="w-40 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /> : row.observacoes ?? '-'}</td>
                    {/* CONTATO */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.contato?.nome ?? '-'}</td>
                    {/* CPF/CNPJ */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap font-mono">{row.contato?.cnpj ?? '-'}</td>
                    {/* CONTA FINANCEIRA */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.contaFinanceira?.descricao ?? '-'}</td>
                    {/* VALOR */}
                    <td className="px-4 py-2.5 text-sm font-medium whitespace-nowrap" style={{ color: isDebito ? '#dc2626' : '#16a34a' }}>
                      {isEditing ? <input type="number" value={editRow.valor} onChange={e => setEditRow((r: any) => ({...r, valor: Number(e.target.value)}))} className="w-24 px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" /> : formatBRL(row.valor)}
                    </td>
                    {/* TIPO ORIGEM */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.origem?.tipo ?? '-'}</td>
                    {/* SITUAÇÃO */}
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.situacao === 'R' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{row.situacao === 'R' ? 'Registrado' : 'Excluído'}</span>
                    </td>
                    {/* ID LANÇAMENTO */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.id}</td>
                    {/* ID CONTA FINANCEIRA */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.contaFinanceira?.id ?? '-'}</td>
                    {/* ID CONTATO */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.contato?.id ?? '-'}</td>
                    {/* ID ORIGEM */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.origem?.id ?? '-'}</td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      {isEditing && <div className="flex gap-1">
                        <button onClick={() => crudAction('put', String(row.id), editRow)} disabled={acting} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditRow(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ColumnFilter */}
      {activeFilter && (() => {
        const anchorRef = { current: thRefs.current[activeFilter] } as React.RefObject<HTMLElement>;
        const options = [...new Set(lancamentos.map(r => getValue(r, activeFilter)).filter(Boolean))].sort();
        return <ColumnFilter column={activeFilter} label={activeFilter} options={options} selected={colFilters[activeFilter] || []} onChange={vals => setColFilters(f => ({...f, [activeFilter!]: vals}))} onClose={() => setActiveFilter(null)} anchorRef={anchorRef} />;
      })()}
    </FullscreenModal>
  );
};
