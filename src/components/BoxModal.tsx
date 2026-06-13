import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUp, ArrowDown, Filter, Check, X as XIcon } from 'lucide-react';
import { FullscreenModal } from './FullscreenModal';
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
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      supabase.from('financial_accounts').select('*').order('canal', { ascending: true })
        .then(({ data, error }) => {
          if (error) console.error(error);
          else setAccounts(data || []);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setActiveFilterCol(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleColClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setActiveFilterCol(prev => prev === key ? null : key);
    } else {
      if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortCol(key); setSortDir('asc'); }
    }
  };

  const getOptions = (key: string) => [...new Set(accounts.map(a => a[key]).filter(Boolean))].sort();

  const displayed = accounts
    .filter(a => Object.entries(colFilters).every(([k, v]) => !v || (a[k] || '').toLowerCase().includes(v.toLowerCase())))
    .sort((a, b) => {
      if (!sortCol) return 0;
      const va = a[sortCol] || '', vb = b[sortCol] || '';
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const handleAddRow = () => {
    setNewRow({});
    setAddingRow(true);
  };

  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSaveRow = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = {
        canal: newRow.canal || '',
        caixa: newRow.caixa || '',
        fornecedor_nome_fantasia: newRow.fornecedor_nome_fantasia || '',
        fornecedor_razao_social: newRow.fornecedor_razao_social || '',
        fornecedor_cnpj: newRow.fornecedor_cnpj || '',
      };
      const { error: insertError } = await supabase.from('financial_accounts').insert(data);
      if (insertError) throw insertError;
      const { data: fresh } = await supabase.from('financial_accounts').select('*').order('canal', { ascending: true });
      setAccounts(fresh || []);
      setAddingRow(false);
      setNewRow({});
    } catch (e: any) {
      console.error('Error saving account:', e);
      setSaveError(e?.message || 'Erro ao salvar');
    }
    finally { setSaving(false); }
  };

  const thCls = (key: string) => {
    const hasFilter = !!colFilters[key];
    return `px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ${
      hasFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
    }`;
  };

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Mapeamento de Caixas">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          <span className="text-xs text-gray-400">{displayed.length} registro(s)</span>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {COLS.map(c => (
                    <th key={c.key} className={thCls(c.key)} onClick={e => handleColClick(e, c.key)}>
                      <div className="flex items-center gap-1">
                        {c.label}
                        {sortCol === c.key && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        {colFilters[c.key] && <Filter className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 sticky top-0 bg-gray-50 dark:bg-gray-700 z-10 w-16" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayed.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {COLS.map(c => (
                      <td key={c.key} className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {a[c.key] || '-'}
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                {/* New inline row */}
                {addingRow && (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                    {COLS.map(c => (
                      <td key={c.key} className="px-4 py-2">
                        <input
                          autoFocus={c.key === 'canal'}
                          value={newRow[c.key] || ''}
                          onChange={e => setNewRow(r => ({ ...r, [c.key]: e.target.value }))}
                          placeholder={c.label}
                          className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={handleSaveRow} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Salvar">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setAddingRow(false)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {displayed.length === 0 && !addingRow && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Filter popup */}
          {activeFilterCol && (
            <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-64">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {COLS.find(c => c.key === activeFilterCol)?.label}
                </span>
                <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
              <select
                autoFocus
                value={colFilters[activeFilterCol] || ''}
                onChange={e => setColFilters(f => ({ ...f, [activeFilterCol!]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                {getOptions(activeFilterCol).map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
              </select>
              {colFilters[activeFilterCol] && (
                <button onClick={() => setColFilters(f => ({ ...f, [activeFilterCol!]: '' }))} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar</button>
              )}
            </div>
          )}
        </div>

        {saveError && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex-shrink-0 text-xs text-red-600 dark:text-red-400">
            Erro: {saveError}
          </div>
        )}
        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400">
          Clique para ordenar · Ctrl+clique para filtrar · ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
