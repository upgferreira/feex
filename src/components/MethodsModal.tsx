import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUp, ArrowDown, Filter, Check, X as XIcon, Pencil, Trash2 } from 'lucide-react';
import { FullscreenModal } from './FullscreenModal';
import { supabase } from '../lib/supabase';

interface MethodsModalProps { isOpen: boolean; onClose: () => void; }

const COLS = [
  { key: 'channel',     label: 'Canal' },
  { key: 'method_type', label: 'Tipo de Método' },
  { key: 'type',        label: 'Tipo' },
  { key: 'label',       label: 'Label' },
  { key: 'instalments', label: 'Parcelas' },
];

export const MethodsModal: React.FC<MethodsModalProps> = ({ isOpen, onClose }) => {
  const [methods, setMethods]         = useState<any[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [sortCol, setSortCol]         = useState<string | null>(null);
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters]   = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [addingRow, setAddingRow]     = useState(false);
  const [editingRow, setEditingRow]   = useState<any | null>(null);
  const [newRow, setNewRow]           = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = React.useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: accs }] = await Promise.all([
        supabase.from('financial_methods').select('*').order('channel'),
        supabase.from('financial_accounts').select('canal').order('canal'),
      ]);
      setMethods(m || []);
      setChannelOptions([...new Set((accs || []).map((r: any) => r.canal).filter(Boolean))].sort() as string[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setActiveFilterCol(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleColClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setActiveFilterCol(prev => prev === key ? null : key); }
    else { if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(key); setSortDir('asc'); } }
  };

  const getOptions = (key: string) => [...new Set(methods.map(m => String(m[key] ?? '')).filter(Boolean))].sort();

  const displayed = methods
    .filter(m => Object.entries(colFilters).every(([k, v]) => !v || String(m[k] ?? '').toLowerCase().includes(v.toLowerCase())))
    .sort((a, b) => !sortCol ? 0 : sortDir === 'asc'
      ? String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''))
      : String(b[sortCol] ?? '').localeCompare(String(a[sortCol] ?? '')));

  const buildData = (row: Record<string, string>) => ({
    channel:     row.channel     || '',
    method_type: row.method_type || '',
    type:        row.type        || '',
    label:       row.label       || '',
    instalments: Number(row.instalments) || 1,
    updated_at:  new Date().toISOString(),
  });

  const handleSaveNew = async () => {
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_methods').insert(buildData(newRow));
      if (error) throw error;
      await load(); setAddingRow(false); setNewRow({});
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('financial_methods').update(buildData(editingRow)).eq('id', editingRow.id);
      if (error) throw error;
      await load(); setEditingRow(null); setSelectedId(null);
    } catch (e: any) { setSaveError(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm('Excluir este método?')) return;
    try {
      await supabase.from('financial_methods').delete().eq('id', selectedId);
      await load(); setSelectedId(null);
    } catch (e: any) { setSaveError(e?.message || 'Erro ao excluir'); }
  };

  const selectedRow = methods.find(m => m.id === selectedId);

  const thCls = (key: string) => {
    const hasFilter = !!colFilters[key];
    return `px-4 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ${
      hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
    }`;
  };

  const renderCell = (col: typeof COLS[0], row: any, isEditing: boolean, setRow: (fn: (r: any) => any) => void) => {
    const val = row[col.key];
    if (!isEditing) return String(val ?? '-');

    if (col.key === 'channel') {
      return (
        <select value={row[col.key] || ''} onChange={e => setRow(r => ({...r, [col.key]: e.target.value}))}
          onClick={e => e.stopPropagation()}
          className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
          <option value="">Canal...</option>
          {channelOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input value={row[col.key] ?? ''} onChange={e => setRow(r => ({...r, [col.key]: e.target.value}))}
        onClick={e => e.stopPropagation()} type={col.key === 'instalments' ? 'number' : 'text'}
        className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" />
    );
  };

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Métodos de Pagamento">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          <span className="text-xs text-gray-400">{displayed.length} registro(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => selectedId && setEditingRow({...selectedRow})} disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={handleDelete} disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-gray-800">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
            <button onClick={() => { setNewRow({ instalments: '1' }); setAddingRow(true); setSelectedId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10 px-4 py-3 sticky top-0 bg-gray-50 dark:bg-gray-700 z-10" />
                  {COLS.map(c => (
                    <th key={c.key} className={thCls(c.key)} onClick={e => handleColClick(e, c.key)}>
                      <div className="flex items-center gap-1">
                        {c.label}
                        {sortCol === c.key && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        {colFilters[c.key] && <Filter className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="w-16 px-4 py-3 sticky top-0 bg-gray-50 dark:bg-gray-700 z-10" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayed.map((m, i) => {
                  const isSelected = m.id === selectedId;
                  const isEditing  = editingRow?.id === m.id;
                  return (
                    <tr key={i} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <td className="px-4 py-3 text-center" onClick={() => setSelectedId(isSelected ? null : m.id)}>
                        <input type="checkbox" checked={isSelected} readOnly className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </td>
                      {COLS.map(col => (
                        <td key={col.key} onClick={() => !isEditing && setSelectedId(isSelected ? null : m.id)}
                          className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {renderCell(col, isEditing ? editingRow : m, isEditing, (fn) => setEditingRow(fn))}
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
                        {c.key === 'channel' ? (
                          <select autoFocus={ci===0} value={newRow[c.key] || ''} onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white">
                            <option value="">Canal...</option>
                            {channelOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input autoFocus={ci===0} value={newRow[c.key] || ''} type={c.key === 'instalments' ? 'number' : 'text'}
                            onChange={e => setNewRow(r => ({...r, [c.key]: e.target.value}))} placeholder={c.label}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 dark:text-white" />
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
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum método cadastrado</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeFilterCol && (
            <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-64">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{COLS.find(c => c.key === activeFilterCol)?.label}</span>
                <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
              <select autoFocus value={colFilters[activeFilterCol] || ''}
                onChange={e => setColFilters(f => ({...f, [activeFilterCol!]: e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todos</option>
                {getOptions(activeFilterCol).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {colFilters[activeFilterCol] && (
                <button onClick={() => setColFilters(f => ({...f, [activeFilterCol!]: ''}))} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar</button>
              )}
            </div>
          )}
        </div>

        {saveError && <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 flex-shrink-0 text-xs text-red-600">Erro: {saveError}</div>}
        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400">
          Clique para selecionar · Ctrl+clique para filtrar · ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
