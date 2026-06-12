import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Upload, Trash2, ArrowUp, ArrowDown, Download, Filter } from 'lucide-react';
import { ImportedFile } from '../types';
import { useFileData } from '../hooks/useFileData';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ImportacaoProps {
  selectedCanal?: string;
}

export const Importacao: React.FC<ImportacaoProps> = ({ selectedCanal = 'TODOS' }) => {
  const { files, loading, error, addFile, removeFile } = useFileData();
  const [sortColumn, setSortColumn] = useState<keyof ImportedFile | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Close filter popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveFilterCol(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    const fileArray = Array.from(selectedFiles);
    const existingNames = files.map(f => f.originalName);
    const duplicates = fileArray.filter(file => existingNames.includes(file.name));
    if (duplicates.length > 0) {
      alert(`Arquivos duplicados não permitidos: ${duplicates.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }
    try {
      for (const file of fileArray) await addFile(file);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    }
    event.target.value = '';
  };

  const handleDownloadFile = (file: ImportedFile) => {
    if (file.data.length === 0) { alert('Arquivo sem dados'); return; }
    const headers = file.columns;
    const csv = [
      headers.join(','),
      ...file.data.map(row =>
        headers.map(h => {
          const v = row[h];
          if (typeof v === 'string' && (v.includes(',') || v.includes('"')))
            return `"${v.replace(/"/g, '""')}"`;
          return v;
        }).join(',')
      )
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = file.originalName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  };

  const handleSort = (col: keyof ImportedFile) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
  };

  const handleColHeaderClick = (e: React.MouseEvent, col: keyof ImportedFile) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setActiveFilterCol(activeFilterCol === col ? null : col);
    } else {
      handleSort(col);
    }
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!fileToDelete || !user) return false;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email!, password });
      if (error) return false;
      await removeFile(fileToDelete);
      setDeleteModalOpen(false);
      setFileToDelete(null);
      return true;
    } catch { return false; }
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);

  const formatCompetencia = (c: string) => c.length === 2 ? `${c}/2025` : c;

  const formatPeriodo = (p: string) => {
    if (p.includes('-')) {
      const parts = p.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[0]}`;
        if (parts[2].length === 4) return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}`;
      }
    }
    return p;
  };

  const CANAL_COLORS: Record<string, string> = {
    'AMAZON': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'MERCADO LIVRE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'MAGAZINE LUIZA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'SHEIN': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'SHOPEE': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };

  const COLUMNS: { key: keyof ImportedFile; label: string }[] = [
    { key: 'canal', label: 'Canal' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'ano', label: 'Ano' },
    { key: 'competencia', label: 'Competência' },
    { key: 'periodoInicial', label: 'Período Inicial' },
    { key: 'periodoFinal', label: 'Período Final' },
    { key: 'arquivo', label: 'Arquivo' },
    { key: 'dataUpload', label: 'Data Upload' },
  ];

  const getUniqueValues = (col: keyof ImportedFile) => {
    return [...new Set(files.map(f => f[col]).filter(Boolean))]
      .sort((a, b) => {
        if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
        return a!.toString().localeCompare(b!.toString());
      });
  };

  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Filter by header canal dropdown
    if (selectedCanal && selectedCanal !== 'TODOS') {
      result = result.filter(f => f.canal === selectedCanal);
    }

    // Column filters
    Object.entries(columnFilters).forEach(([col, val]) => {
      if (val) {
        result = result.filter(f => {
          const v = f[col as keyof ImportedFile];
          if (col === 'dataUpload' && v instanceof Date) return v.toISOString().includes(val);
          return v?.toString().toLowerCase().includes(val.toLowerCase());
        });
      }
    });

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const av = a[sortColumn], bv = b[sortColumn];
        if (av == null) return 1;
        if (bv == null) return -1;
        let cmp = 0;
        if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
        else cmp = av.toString().localeCompare(bv.toString());
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [files, columnFilters, sortColumn, sortDirection, selectedCanal]);

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Importação de Dados</h2>
            <div className="flex items-center gap-2">
              {Object.keys(columnFilters).some(k => columnFilters[k]) && (
                <button
                  onClick={() => setColumnFilters({})}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Filter className="w-3 h-3" /> Limpar filtros
                </button>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                {loading ? 'Processando...' : 'Upload Arquivo'}
                <input type="file" accept=".txt,.csv,.xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={loading} multiple />
              </label>
            </div>
          </div>
        </div>

        {/* Table — full width, no padding */}
        <div className="flex-1 overflow-hidden relative">
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {COLUMNS.map(({ key, label }) => {
                    const hasFilter = !!columnFilters[key];
                    return (
                      <th
                        key={key}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none transition-colors
                          ${hasFilter
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        onClick={e => handleColHeaderClick(e, key)}
                      >
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {label}
                          {sortColumn === key && (
                            sortDirection === 'asc'
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />
                          )}
                          {hasFilter && <Filter className="w-3 h-3" />}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum arquivo encontrado</p>
                        <p className="text-gray-400 dark:text-gray-500">Faça upload de arquivos para começar</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CANAL_COLORS[file.canal] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {file.canal}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{file.tipo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{file.ano}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatCompetencia(file.competencia)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatPeriodo(file.periodoInicial)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatPeriodo(file.periodoFinal)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={file.originalName}>{file.originalName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(file.dataUpload)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDownloadFile(file)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setFileToDelete(file.id); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Ctrl+click filter popup */}
          {activeFilterCol && (
            <div
              ref={filterRef}
              className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Filtrar: {COLUMNS.find(c => c.key === activeFilterCol)?.label}
                </span>
                <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
              </div>
              <select
                autoFocus
                value={columnFilters[activeFilterCol] || ''}
                onChange={e => {
                  setColumnFilters(f => ({ ...f, [activeFilterCol]: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {getUniqueValues(activeFilterCol as keyof ImportedFile).map(v => {
                  const str = v instanceof Date ? v.toISOString() : v!.toString();
                  const display = v instanceof Date ? formatDate(v) : v!.toString();
                  return <option key={str} value={str}>{display}</option>;
                })}
              </select>
              {columnFilters[activeFilterCol] && (
                <button
                  onClick={() => { setColumnFilters(f => ({ ...f, [activeFilterCol!]: '' })); }}
                  className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center"
                >
                  Limpar este filtro
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};
