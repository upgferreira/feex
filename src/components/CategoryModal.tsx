import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUp, ArrowDown, Filter, Check, X as XIcon, Pencil, Trash2 } from 'lucide-react';
import { FullscreenModal } from './FullscreenModal';
import { invalidateCache } from '../hooks/useCache';
import { ColumnFilter, FilterBadge } from './ColumnFilter';
import { supabase } from '../lib/supabase';

interface CategoryModalProps { isOpen: boolean; onClose: () => void; }

const COLS = [
  { key: 'channel',             label: 'Canal',                type: 'channel' },
  { key: 'channel_group',       label: 'Grupo',                type: 'text' },
  { key: 'channel_category',    label: 'Categoria Canal',      type: 'text' },
  { key: 'erp_parent_category', label: 'Categoria Pai ERP',    type: 'text' },
  { key: 'erp_category',        label: 'Categoria ERP',        type: 'text' },
  { key: 'category_type',       label: 'Tipo',                 type: 'type' },
  { key: 'deducted',            label: 'Descontado',           type: 'text' },
  { key: 'invoice',             label: 'NF-e',                 type: 'text' },
];

const TYPE_OPTIONS = ['Despesa', 'Receita'];

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: cats }, { data: accs }] = await Promise.all([
        supabase.from('financial_categories').select('*').order('channel', { ascending: true }),
        supabase.from('financial_accounts').select('canal').order('canal', { ascending: true }),
      ]);
      setCategories(cats || []);
      setChannelOptions([...new Set((accs || []).map((r: any) => r.canal).filter(Boolean))].sort() as string[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) { loadData(); setViewMode('app'); } }, [isOpen]);

  const fetchBlingCats = async () => {
    setBlingLoading(true); setBlingError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setBlingError('Não autenticado'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling_getCategorias`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      const json = await res.json();
      if (json.error) { setBlingError(json.error); return; }
      setBlingCats(json.data || []);
    } catch (e: any) { setBlingError(e.message); }
    finally { setBlingLoading(false); }
  };



  const handleColClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setActiveFilterCol(prev => prev === key ? null : key); }
    else { if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(key); setSortDir('asc'); } }
  };

  const getOptions = (key: string) => [...new Set(categories.map(c => c[key]).filter(Boolean))].sort();

  const displayed = categories
    .filter(c => Object.entries(colFilters).every(([k, vals]) => !vals?.length || vals.includes(String(c[k] ?? ''))))
    .sort((a, b) => {
      if (!sortCol) return 0;
      return sortDir === 'asc' ? (a[sortCol] || '').localeCompare(b[sortCol] || '') : (b[sortCol] || '').localeCompare(a[sortCol] || '');
    });

  const buildData = (row: Record<string, string>) => ({
    channel: row.channel || '', channel_group: row.channel_group || '',
    channel_category: row.channel_category || '', erp_parent_category: row.erp_parent_category || '',
    erp_category: row.erp_category || '', category_type: row.category_type || '',
    deducted: row.deducted || '', invoice: row.invoice || '',
  });

  const handleSaveNew = async () => {
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_categories').insert(buildData(newRow));
      if (error) throw error;
      await loadData(); setAddingRow(false); setNewRow({});
      invalidateCache('categories');
      invalidateCache('accounts');
      window.dispatchEvent(new CustomEvent('categories-updated'));
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_categories').update(buildData(editingRow)).eq('id', editingRow.id);
      if (error) throw error;
      await loadData(); setEditingRow(null); setSelectedId(null);
      invalidateCache('categories');
      invalidateCache('accounts');
      window.dispatchEvent(new CustomEvent('categories-updated'));
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Excluir esta categoria?')) return;
    try {
      await supabase.from('financial_categories').delete().eq('id', selectedId);
      await loadData(); setSelectedId(null);
      invalidateCache('categories');
      invalidateCache('accounts');
      window.dispatchEvent(new CustomEvent('categories-updated'));
    } catch (e: any) { setSaveError(e?.message || 'Erro ao excluir'); }
  };

  const thCls = (key: string) => {
    const hasFilter = !!colFilters[key];
    return `px-4 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ${
      hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
    }`;
  };

  const selectedRow = categories.find(c => c.id === selectedId);

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Mapeamento de Categorias">
      <div className="flex flex-col h-full">
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{displayed.length} registro(s)</span>
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(['app', 'erp'] as const).map(m => (
                <button key={m} onClick={() => { setViewMode(m); if (m === 'erp' && blingCats.length === 0) fetchBlingCats(); }}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${viewMode === m ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (!selectedId) return; setEditingRow({...selectedRow}); }}
              disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={handleDelete} disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-gray-800">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
            <button onClick={() => { setNewRow({}); setAddingRow(true); setSelectedId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          {/* ERP (Bling) categories view */}
          {viewMode === 'erp' && (
            <div className="h-full overflow-auto">
              {blingLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              ) : blingError ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <p className="text-red-500 text-sm">{blingError}</p>
                  <button onClick={fetchBlingCats} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Tentar novamente</button>
                </div>
              ) : blingCats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <p className="text-gray-500 text-sm">Nenhuma categoria encontrada no Bling</p>
                  <button onClick={fetchBlingCats} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Carregar</button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria Pai</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {blingCats.map((cat: any) => (
                      <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{cat.id}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">{cat.descricao}</td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{cat.categoriaPai?.descricao ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {/* APP (FEEX) categories view */}
          {viewMode === 'app' && (
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
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
                {displayed.map((c, i) => {
                  const isSelected = c.id === selectedId;
                  const isEditing = editingRow?.id === c.id;
                  return (
                    <tr key={i}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <td className="px-4 py-3 text-center" onClick={() => setSelectedId(isSelected ? null : c.id)}>
                        <input type="checkbox" checked={isSelected} readOnly
                          className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </td>
                      {COLS.map(col => (
                        <td key={col.key} onClick={() => !isEditing && setSelectedId(isSelected ? null : c.id)} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {isEditing ? (
                            col.type === 'channel' ? (
                              <select value={editingRow[col.key] || ''} onChange={e => setEditingRow((r: any) => ({...r, [col.key]: e.target.value}))}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Canal...</option>
                                {channelOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : col.type === 'type' ? (
                              <select value={editingRow[col.key] || ''} onChange={e => setEditingRow((r: any) => ({...r, [col.key]: e.target.value}))}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Tipo...</option>
                                {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input value={editingRow[col.key] || ''} onChange={e => setEditingRow((r: any) => ({...r, [col.key]: e.target.value}))}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" />
                            )
                          ) : (
                            col.key === 'category_type' && c[col.key] ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c[col.key] === 'Receita' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                                {c[col.key]}
                              </span>
                            ) : (c[col.key] || '-')
                          )}
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
                        {c.type === 'channel' ? (
                          <select autoFocus={ci === 0} value={newRow[c.key] || ''} onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
                            <option value="">Canal...</option>
                            {channelOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : c.type === 'type' ? (
                          <select value={newRow[c.key] || ''} onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
                            <option value="">Tipo...</option>
                            {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input autoFocus={ci === 0} value={newRow[c.key] || ''} onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))}
                            placeholder={c.label}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                        )}
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
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          )}

          )}

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

        {saveError && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 flex-shrink-0 text-xs text-red-600">Erro: {saveError}</div>
        )}
        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400">
          Clique para selecionar · Ctrl+clique para filtrar · ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
