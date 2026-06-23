import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUp, ArrowDown, Filter, Check, X as XIcon, Pencil, Trash2 } from 'lucide-react';
import { FullscreenModal } from './FullscreenModal';
import { ColumnFilter, FilterBadge } from './ColumnFilter';
import { supabase } from '../lib/supabase';

interface BoxModalProps { isOpen: boolean; onClose: () => void; }

const COLS = [
  { key: 'canal', label: 'Canal' },
  { key: 'caixa', label: 'Caixa' },
  { key: 'fornecedor_nome_fantasia', label: 'Nome Fantasia' },
  { key: 'fornecedor_razao_social', label: 'Razão Social' },
  { key: 'fornecedor_cnpj', label: 'CNPJ' },
];

export const BoxModal: React.FC<BoxModalProps> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [viewMode, setViewMode]         = useState<'app' | 'erp'>('app');
  const [blingContas, setBlingContas]   = useState<any[]>([]);
  const [blingLoading, setBlingLoading] = useState(false);
  const [blingError, setBlingError]     = useState<string | null>(null);
  const [blingSortCol, setBlingSortCol] = useState<string>('descricao');
  const [blingSortDir, setBlingSortDir] = useState<'asc' | 'desc'>('asc');
  const [blingColFilters, setBlingColFilters] = useState<Record<string, string[]>>({});
  const [blingActiveFilter, setBlingActiveFilter] = useState<string | null>(null);
  const blingThRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('financial_accounts').select('*').order('canal');
      setAccounts(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) { load(); setViewMode('app'); } }, [isOpen]);

  const fetchBlingContas = async (force = false) => {
    if (!force && blingContas.length > 0) return;
    setBlingLoading(true); setBlingError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setBlingError('Não autenticado'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling_getContasFinanceiras`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } }
      );
      const json = await res.json();
      if (json.error) { setBlingError(json.error); return; }
      setBlingContas(json.data || []);
    } catch (e: any) { setBlingError(e.message); }
    finally { setBlingLoading(false); }
  };

  const handleColClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setActiveFilterCol(prev => prev === key ? null : key); }
    else { if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(key); setSortDir('asc'); } }
  };

  const getOptions = (key: string) => [...new Set(accounts.map(a => a[key]).filter(Boolean))].sort();

  const displayed = accounts
    .filter(a => Object.entries(colFilters).every(([k, vals]) => !vals?.length || vals.includes(String(a[k] ?? ''))))
    .sort((a, b) => !sortCol ? 0 : sortDir === 'asc' ? (a[sortCol]||'').localeCompare(b[sortCol]||'') : (b[sortCol]||'').localeCompare(a[sortCol]||''));

  const buildData = (row: Record<string, string>) => ({
    canal: row.canal || '', caixa: row.caixa || '',
    fornecedor_nome_fantasia: row.fornecedor_nome_fantasia || '',
    fornecedor_razao_social: row.fornecedor_razao_social || '',
    fornecedor_cnpj: row.fornecedor_cnpj || '',
  });

  const handleSaveNew = async () => {
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_accounts').insert(buildData(newRow));
      if (error) throw error;
      await load(); setAddingRow(false); setNewRow({});
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_accounts').update(buildData(editingRow)).eq('id', editingRow.id);
      if (error) throw error;
      await load(); setEditingRow(null); setSelectedId(null);
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm('Excluir esta conta?')) return;
    try {
      await supabase.from('financial_accounts').delete().eq('id', selectedId);
      await load(); setSelectedId(null);
    } catch (e: any) { setSaveError(e?.message || 'Erro ao excluir'); }
  };

  const thCls = (key: string) => {
    const hasFilter = !!colFilters[key];
    return `px-4 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ${
      hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
    }`;
  };

  const selectedRow = accounts.find(a => a.id === selectedId);

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Contas Financeiras">
      <div className="flex flex-col h-full">
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{viewMode === 'app' ? `${displayed.length} registro(s)` : `${blingContas.length} contas`}</span>
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
              {(['app', 'erp'] as const).map(m => (
                <button key={m} onClick={() => { setViewMode(m); if (m === 'erp' && blingContas.length === 0) fetchBlingContas(); }}
                  className={`w-16 py-1.5 text-xs font-semibold transition-colors text-center ${
                    viewMode === m ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'
                  }`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {viewMode === 'app' && <div className="flex items-center gap-2">
            <button onClick={() => selectedId && setEditingRow({...selectedRow})} disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={handleDelete} disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-gray-800">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
            <button onClick={() => { setNewRow({}); setAddingRow(true); setSelectedId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>}
        </div>

        <div className="flex-1 overflow-auto relative">

          {/* ERP (Bling) contas view */}
          {viewMode === 'erp' && (
            <div className="h-full overflow-auto">
              {blingLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              ) : blingError ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <p className="text-red-500 text-sm">{blingError}</p>
                  <button onClick={() => fetchBlingContas(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Tentar novamente</button>
                </div>
              ) : blingContas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <p className="text-gray-500 text-sm">Nenhuma conta encontrada no Bling</p>
                  <button onClick={() => fetchBlingContas(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Carregar</button>
                </div>
              ) : (() => {
                let filtered = [...blingContas];
                Object.entries(blingColFilters).forEach(([k, vals]) => {
                  if (vals?.length) filtered = filtered.filter((r: any) => vals.includes(String(r[k] ?? '')));
                });
                const sorted = filtered.sort((a: any, b: any) => {
                  const mul = blingSortDir === 'asc' ? 1 : -1;
                  return mul * String(a[blingSortCol] ?? '').localeCompare(String(b[blingSortCol] ?? ''));
                });
                const blingCols: [string, string][] = [['descricao','Descrição'],['tipo','Tipo'],['aliasIntegracao','Alias'],['id','ID']];
                return (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        {blingCols.map(([key, h]) => (
                          <th key={key}
                            ref={el => { blingThRefs.current[key] = el as HTMLTableCellElement; }}
                            onClick={e => {
                              if (e.ctrlKey || e.metaKey) { e.preventDefault(); setBlingActiveFilter(prev => prev === key ? null : key); }
                              else { if (blingSortCol === key) setBlingSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setBlingSortCol(key); setBlingSortDir('asc'); } }
                            }}
                            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${blingColFilters[key]?.length ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                            <div className="flex items-center gap-1">
                              {h}
                              {blingSortCol === key ? (blingSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                              {blingColFilters[key]?.length ? <Filter className="w-3 h-3" /> : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sorted.map((conta: any) => (
                        <tr key={conta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{conta.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{conta.descricao}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{conta.tipo ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{conta.aliasIntegracao ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {blingActiveFilter && (() => {
                const anchorRef = { current: blingThRefs.current[blingActiveFilter] } as React.RefObject<HTMLElement>;
                const options = [...new Set(blingContas.map((c: any) => String(c[blingActiveFilter] ?? '')).filter(Boolean))].sort();
                return (
                  <ColumnFilter
                    column={blingActiveFilter}
                    label={blingActiveFilter}
                    options={options}
                    selected={blingColFilters[blingActiveFilter] || []}
                    onChange={vals => setBlingColFilters(f => ({ ...f, [blingActiveFilter!]: vals }))}
                    onClose={() => setBlingActiveFilter(null)}
                    anchorRef={anchorRef}
                  />
                );
              })()}
            </div>
          )}
          {viewMode === 'app' && loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : viewMode === 'app' ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10 px-4 py-3 sticky top-0 bg-gray-50 dark:bg-gray-700 z-10" />
                  {COLS.map(c => (
                    <th key={c.key} ref={el => thRefs.current[c.key] = el as HTMLTableCellElement} className={thCls(c.key)} onClick={e => handleColClick(e, c.key)}>
                      <div className="flex items-center gap-1">
                        {c.label}
                        {sortCol === c.key && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        {colFilters[c.key] && <Filter className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 sticky top-0 bg-gray-50 dark:bg-gray-700 z-10 w-16" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayed.map((a, i) => {
                  const isSelected = a.id === selectedId;
                  const isEditing = editingRow?.id === a.id;
                  return (
                    <tr key={i} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <td className="px-4 py-3 text-center" onClick={() => setSelectedId(isSelected ? null : a.id)}>
                        <input type="checkbox" checked={isSelected} readOnly className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </td>
                      {COLS.map(col => (
                        <td key={col.key} onClick={() => !isEditing && setSelectedId(isSelected ? null : a.id)}
                          className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {isEditing ? (
                            <input value={editingRow[col.key] || ''} onChange={e => setEditingRow((r: any) => ({...r, [col.key]: e.target.value}))}
                              onClick={e => e.stopPropagation()}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" />
                          ) : (a[col.key] || '-')}
                        </td>
                      ))}
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        {isEditing && (
                          <div className="flex items-center gap-1">
                            <button onClick={handleSaveEdit} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingRow(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {addingRow && (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                    <td className="px-4 py-2" />
                    {COLS.map((c, ci) => (
                      <td key={c.key} className="px-3 py-2">
                        <input autoFocus={ci === 0} value={newRow[c.key] || ''} onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))}
                          placeholder={c.label}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={handleSaveNew} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setAddingRow(false); setSaveError(null); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><XIcon className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )}
                {displayed.length === 0 && !addingRow && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          ) : null}

          {activeFilterCol && (() => {
            const anchorRef = { current: thRefs.current[activeFilterCol] } as React.RefObject<HTMLElement>;
            return (
              <ColumnFilter
                column={activeFilterCol}
                label={COLS.find(c => c.key === activeFilterCol)?.label || activeFilterCol}
                options={getOptions(activeFilterCol).map(String)}
                selected={colFilters[activeFilterCol] || []}
                onChange={vals => setColFilters(f => ({...f, [activeFilterCol!]: vals}))}
                onClose={() => setActiveFilterCol(null)}
                anchorRef={anchorRef}
              />
            );
          })()}
        </div>

        {saveError && <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 flex-shrink-0 text-xs text-red-600">Erro: {saveError}</div>}
        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400">
          Clique para selecionar · Ctrl+clique para filtrar · ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
