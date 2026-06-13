import React, { useState, useCallback } from 'react';
import { Upload, Trash2, Download } from 'lucide-react';
import { useFileData } from '../hooks/useFileData';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { DataTable, FormatBadge, DataTableColumn } from './DataTable';

interface ImportacaoProps { selectedCanal?: string; }

const CANAL_COLORS: Record<string, string> = {
  'AMAZON':         'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  'MERCADO LIVRE':  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  'MAGAZINE LUIZA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'SHEIN':          'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'SHOPEE':         'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

function formatPeriodo(p: string) {
  if (!p) return '-';
  if (p.includes('-')) {
    const parts = p.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[0]}`;
      if (parts[2].length === 4) return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}`;
    }
  }
  return p;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);
}

export const Importacao: React.FC<ImportacaoProps> = ({ selectedCanal = 'TODOS' }) => {
  const { files, loading, error, addFile, removeFile } = useFileData();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const { user } = useAuth();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const fileArray = Array.from(selected);
    const existingNames = files.map(f => f.originalName);
    const duplicates = fileArray.filter(f => existingNames.includes(f.name));
    if (duplicates.length > 0) {
      alert(`Arquivos duplicados: ${duplicates.map(f => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }
    for (const file of fileArray) await addFile(file);
    e.target.value = '';
  };

  const handleDownload = (file: any) => {
    if (!file.data?.length) { alert('Arquivo sem dados'); return; }
    const headers = file.columns;
    const csv = [
      headers.join(','),
      ...file.data.map((row: any) =>
        headers.map((h: string) => {
          const v = row[h];
          if (typeof v === 'string' && (v.includes(',') || v.includes('"')))
            return `"${v.replace(/"/g,'""')}"`;
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

  const filteredFiles = files
    .filter(f => selectedCanal === 'TODOS' || f.canal === selectedCanal)
    .map(f => ({
      ...f,
      _periodoInicial: formatPeriodo(f.periodoInicial),
      _periodoFinal: formatPeriodo(f.periodoFinal),
      _dataUpload: formatDate(f.dataUpload),
      _formato: (f.originalName || '').split('.').pop()?.toUpperCase() || '',
    }));

  const columns: DataTableColumn[] = [
    {
      key: 'canal', label: 'Canal',
      render: (v) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CANAL_COLORS[v] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {v}
        </span>
      ),
    },
    { key: 'tipo', label: 'Tipo' },
    { key: 'ano', label: 'Ano', width: 'compact' },
    { key: 'competencia', label: 'Competência', width: 'compact' },
    { key: '_periodoInicial', label: 'Período Inicial', width: 'compact' },
    { key: '_periodoFinal', label: 'Período Final', width: 'compact' },
    { key: 'originalName', label: 'Arquivo', width: 'wrap' },
    { key: '_formato', label: 'Formato', render: (v) => <FormatBadge value={v} /> },
    { key: '_dataUpload', label: 'Data Upload', width: 'compact' },
  ];

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Importação de Dados</h2>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              {loading ? 'Processando...' : 'Upload Arquivo'}
              <input type="file" accept=".txt,.csv,.xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={loading} multiple />
            </label>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex-shrink-0">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={filteredFiles}
          rowKey={row => row.id}
          emptyIcon={<Upload className="w-12 h-12" />}
          emptyText="Nenhum arquivo encontrado"
          emptySubText="Faça upload de arquivos para começar"
          actions={row => (
            <div className="flex items-center gap-2">
              <button onClick={() => handleDownload(row)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => { setFileToDelete(row.id); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Excluir">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};
