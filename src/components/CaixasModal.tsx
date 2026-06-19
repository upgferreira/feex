import React, { useState, useEffect, useRef } from 'react';
import { FullscreenModal } from './FullscreenModal';
import { ColumnFilter } from './ColumnFilter';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Check, X as XIcon, ArrowUp, ArrowDown, Filter, RefreshCw } from 'lucide-react';

interface CaixasModalProps { isOpen: boolean; onClose: () => void; }

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}

// Columns in exact display order
const COLS: [string, string][] = [
  ['data',               'Data'],
  ['competencia',        'Competência'],
  ['categoria',          'Categoria'],
  ['observacoes',        'Observações'],
  ['contato_nome',       'Contato'],
  ['contato_cnpj',       'CPF/CNPJ'],
  ['contaFinanceira',    'Conta Financeira'],
  ['valor',              'Valor'],
  ['origem_tipo',        'Tipo Origem'],
  ['situacao',           'Situação'],
  ['id',                 'ID Lançamento'],
  ['contaFinanceira_id', 'ID Conta Fin.'],
  ['contato_id',         'ID Contato'],
  ['origem_id',          'ID Origem'],
];

export const CaixasModal: React.FC<CaixasModalProps> = ({ isOpen, onClose }) => {
  const [contas, setContas]             = useState<any[]>([]);
  const [categorias, setCategorias]     = useState<any[]>([]);
  const [contaSel, setContaSel]         = useState<any | null>(null);
  const [lancamentos, setLancamentos]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [acting, setActing]             = useState(false);

  const [sortCol, setSortCol]           = useState<string>('data');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [colFilters, setColFilters]     = useState<Record<string, string[]>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const [editRow, setEditRow]           = useState<any | null>(null);
  const [addRow, setAddRow]             = useState<any | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [dataInicial, setDataInicial]   = useState('');
  const [dataFinal, setDataFinal]       = useState('');

  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const getH = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
  };

  const loadAll = async () => {
    try {
      const h = await getH();
      const [r1, r2] = await Promise.all([
        fetch(`${base}/bling_getContasFinanceiras`, { headers: h }),
        fetch(`${base}/bling_getCategoriasFinanceiras`, { headers: h }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (j1.error) { setError(j1.error); return; }
      setContas(j1.data || []);
      if (!j2.error) setCategorias(j2.data || []);
    } catch (e: any) { setError(e.message); }
  };

  const loadLancamentos = async (conta: any) => {
    setLoading(true); setError(null); setLancamentos([]); setSelectedIds(new Set());
    try {
      const h = await getH();
      const params = new URLSearchParams({ idContaFinanceira: String(conta.id) });
      if (dataInicial) params.set('dataInicial', dataInicial);
      if (dataFinal)   params.set('dataFinal', dataFinal);
      const res  = await fetch(`${base}/bling_getCaixas?${params}`, { headers: h });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      // Enrich with full data via GET by ID (competencia, categoria)
      const items = json.data || [];
      const enriched = await Promise.all(items.map(async (item: any) => {
        try {
          const r = await fetch(`${base}/bling_getCaixasID?id=${item.id}`, { headers: h });
          const d = await r.json();
          return d?.data ?? item;
        } catch { return item; }
      }));
      setLancamentos(enriched);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const crudAction = async (action: 'post' | 'put' | 'delete', id: string | null, body: any) => {
    setActing(true);
    try {
      const h = await getH();
      let res;
      if (action === 'post')       res = await fetch(`${base}/bling_postCaixas`,           { method: 'POST', headers: h, body: JSON.stringify(body) });
      else if (action === 'put')   res = await fetch(`${base}/bling_putCaixasID?id=${id}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
      else                         res = await fetch(`${base}/bling_deleteCaixasID?id=${id}`, { method: 'POST', headers: h, body: JSON.stringify({}) });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setEditRow(null); setAddRow(null); setSelectedIds(new Set());
      if (contaSel) await loadLancamentos(contaSel);
    } catch (e: any) { setError(e.message); }
    finally { setActing(false); }
  };

  useEffect(() => { if (isOpen) { loadAll(); setContaSel(null); setLancamentos([]); } }, [isOpen]);

  const getVal = (row: any, col: string): string => {
    switch (col) {
      case 'categoria':          return row.categoria?.descricao ?? row.descricao ?? '-';
      case 'contato_nome':       return row.contato?.nome ?? '-';
      case 'contato_cnpj':       return row.contato?.cnpj ?? '-';
      case 'contato_id':         return String(row.contato?.id ?? '-');
      case 'contaFinanceira':    return row.contaFinanceira?.descricao ?? '-';
      case 'contaFinanceira_id': return String(row.contaFinanceira?.id ?? '-');
      case 'origem_tipo':        return row.origem?.tipo ?? '-';
      case 'origem_id':          return String(row.origem?.id ?? '-');
      case 'valor':              return formatBRL(row.valor);
      case 'situacao':           return row.situacao === 'E' ? 'Excluído' : 'Registrado';
      default:                   return String(row[col] ?? '-');
    }
  };

  const displayed = React.useMemo(() => {
    let data = [...lancamentos];
    Object.entries(colFilters).forEach(([k, vals]) => {
      if (vals?.length) data = data.filter(r => vals.includes(getVal(r, k)));
    });
    data.sort((a, b) => {
      const av = col => { if (col === 'valor') return a.valor ?? 0; return getVal(a, col); };
      const bv = col => { if (col === 'valor') return b.valor ?? 0; return getVal(b, col); };
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = av(sortCol), vb = bv(sortCol);
      if (typeof va === 'number' && typeof vb === 'number') return mul * (va - vb);
      return mul * String(va).localeCompare(String(vb));
    });
    return data;
  }, [lancamentos, colFilters, sortCol, sortDir]);

  const handleColClick = (e: React.MouseEvent, col: string) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setActiveFilter(p => p === col ? null : col); }
    else { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } }
  };

  const toggleSel = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const catSelect = (val: string, setter: (fn: (r: any) => any) => void) => {
    const c = categorias.find((cat: any) => String(cat.id) === val);
    setter((r: any) => ({ ...r, categoria: c ? { id: c.id } : undefined, descricao: c?.descricao }));
  };

  const inCls = "px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white";

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Caixas e Bancos (ERP)">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0 bg-gray-50 dark:bg-gray-900 flex-wrap">
        <select value={contaSel?.id ?? ''} onChange={e => { const c = contas.find(c => String(c.id) === e.target.value); setContaSel(c ?? null); if (c) loadLancamentos(c); }}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-[220px]">
          <option value="">Selecione a conta...</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
        </select>
        <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <button onClick={() => contaSel && loadLancamentos(contaSel)} disabled={!contaSel || loading}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="text-xs text-gray-400">{displayed.length} lançamento(s) · {selectedIds.size} selecionado(s)</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { const r = lancamentos.find(l => selectedIds.has(String(l.id))); if (r) { setAddRow(null); setEditRow({ ...r }); }}}
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

      {error && <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm flex-shrink-0">⚠️ {error}</div>}

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
                <th className="px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

              {/* ── ADD ROW: same column order as COLS ── */}
              {addRow && (
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td />{/* checkbox */}
                  {/* DATA */}
                  <td className="px-3 py-2"><input type="date" value={addRow.data ?? ''} onChange={e => setAddRow((r: any) => ({ ...r, data: e.target.value }))} className={inCls} /></td>
                  {/* COMPETÊNCIA */}
                  <td className="px-3 py-2"><input type="date" value={addRow.competencia ?? ''} onChange={e => setAddRow((r: any) => ({ ...r, competencia: e.target.value }))} className={inCls} /></td>
                  {/* CATEGORIA */}
                  <td className="px-3 py-2">
                    <select value={addRow.categoria?.id ?? ''} onChange={e => catSelect(e.target.value, setAddRow)} className={`w-48 ${inCls}`}>
                      <option value="">— Categoria —</option>
                      {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                    </select>
                  </td>
                  {/* OBSERVAÇÕES */}
                  <td className="px-3 py-2"><input value={addRow.observacoes ?? ''} onChange={e => setAddRow((r: any) => ({ ...r, observacoes: e.target.value }))} placeholder="Observações" className={`w-40 ${inCls}`} /></td>
                  {/* CONTATO | CPF/CNPJ | CONTA — vazio */}
                  <td colSpan={3} />
                  {/* VALOR */}
                  <td className="px-3 py-2"><input type="number" step="0.01" value={addRow.valor ?? 0} onChange={e => setAddRow((r: any) => ({ ...r, valor: Number(e.target.value) }))} className={`w-24 ${inCls}`} /></td>
                  {/* TIPO ORIGEM | SITUAÇÃO | IDs — vazio */}
                  <td colSpan={5} />
                  {/* AÇÕES */}
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => crudAction('post', null, { ...addRow, debCred: addRow.debCred ?? 'D', contaFinanceira: { id: contaSel?.id } })} disabled={acting} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setAddRow(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── DATA ROWS ── */}
              {displayed.length === 0 ? (
                <tr><td colSpan={16} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum lançamento encontrado</td></tr>
              ) : displayed.map((row: any) => {
                const id = String(row.id);
                const isEditing = editRow?.id === row.id;
                const isDebito  = row.debCred === 'D';
                return (
                  <tr key={id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    {/* CHECKBOX */}
                    <td className="px-3 py-2.5 text-center" onClick={() => toggleSel(id)}>
                      <input type="checkbox" readOnly checked={selectedIds.has(id)} className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                    </td>
                    {/* DATA */}
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {isEditing ? <input type="date" value={editRow.data ?? ''} onChange={e => setEditRow((r: any) => ({ ...r, data: e.target.value }))} className={inCls} /> : row.data ?? '-'}
                    </td>
                    {/* COMPETÊNCIA */}
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {isEditing ? <input type="date" value={editRow.competencia ?? ''} onChange={e => setEditRow((r: any) => ({ ...r, competencia: e.target.value }))} className={inCls} /> : row.competencia ?? '-'}
                    </td>
                    {/* CATEGORIA */}
                    <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                      {isEditing ? (
                        <select value={editRow.categoria?.id ?? ''} onChange={e => catSelect(e.target.value, setEditRow)} className={`w-48 ${inCls}`}>
                          <option value="">— Categoria —</option>
                          {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                        </select>
                      ) : row.categoria?.descricao ?? row.descricao ?? '-'}
                    </td>
                    {/* OBSERVAÇÕES */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 max-w-[200px] truncate">
                      {isEditing ? <input value={editRow.observacoes ?? ''} onChange={e => setEditRow((r: any) => ({ ...r, observacoes: e.target.value }))} className={`w-40 ${inCls}`} /> : row.observacoes ?? '-'}
                    </td>
                    {/* CONTATO */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.contato?.nome ?? '-'}</td>
                    {/* CPF/CNPJ */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap font-mono">{row.contato?.cnpj ?? '-'}</td>
                    {/* CONTA FINANCEIRA */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.contaFinanceira?.descricao ?? '-'}</td>
                    {/* VALOR */}
                    <td className="px-4 py-2.5 text-sm font-medium whitespace-nowrap" style={{ color: isDebito ? '#dc2626' : '#16a34a' }}>
                      {isEditing ? <input type="number" step="0.01" value={editRow.valor ?? 0} onChange={e => setEditRow((r: any) => ({ ...r, valor: Number(e.target.value) }))} className={`w-24 ${inCls}`} /> : formatBRL(row.valor)}
                    </td>
                    {/* TIPO ORIGEM */}
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{row.origem?.tipo ?? '-'}</td>
                    {/* SITUAÇÃO */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.situacao !== 'E' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                        {row.situacao === 'E' ? 'Excluído' : 'Registrado'}
                      </span>
                    </td>
                    {/* ID LANÇAMENTO */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.id}</td>
                    {/* ID CONTA FINANCEIRA */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.contaFinanceira?.id ?? '-'}</td>
                    {/* ID CONTATO */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.contato?.id ?? '-'}</td>
                    {/* ID ORIGEM */}
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{row.origem?.id ?? '-'}</td>
                    {/* AÇÕES */}
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      {isEditing && (
                        <div className="flex gap-1">
                          <button onClick={() => crudAction('put', String(row.id), editRow)} disabled={acting} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditRow(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                        </div>
                      )}
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
        const options = [...new Set(lancamentos.map(r => getVal(r, activeFilter)).filter(v => v && v !== '-'))].sort();
        return (
          <ColumnFilter column={activeFilter} label={COLS.find(([k]) => k === activeFilter)?.[1] ?? activeFilter}
            options={options} selected={colFilters[activeFilter] || []}
            onChange={vals => setColFilters(f => ({ ...f, [activeFilter!]: vals }))}
            onClose={() => setActiveFilter(null)} anchorRef={anchorRef} />
        );
      })()}
    </FullscreenModal>
  );
};
