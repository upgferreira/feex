import React, { useState, useMemo } from 'react';
import { Upload, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { ImportedFile } from '../types';
import { useFileData } from '../hooks/useFileData';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export const Importacao: React.FC = () => {
  const { files, loading, error, addFile, removeFile } = useFileData();
  const [sortColumn, setSortColumn] = useState<keyof ImportedFile | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const fileArray = Array.from(selectedFiles);
      
      // Check for duplicate names
      const existingNames = files.map(f => f.originalName);
      const duplicates = fileArray.filter(file => existingNames.includes(file.name));
      
      if (duplicates.length > 0) {
        alert(`Arquivos com nomes duplicados não são permitidos: ${duplicates.map(f => f.name).join(', ')}`);
        event.target.value = '';
        return;
      }

      try {
        // Process files sequentially to avoid overwhelming the system
        for (const file of fileArray) {
          await addFile(file);
        }
      } catch (err) {
        console.error('Erro ao fazer upload:', err);
      }
    }
    event.target.value = '';
  };

  const handleDownloadFile = (file: ImportedFile) => {
    // Convert the file data back to CSV format
    if (file.data.length === 0) {
      alert('Arquivo não possui dados para download');
      return;
    }

    const headers = file.columns;
    const csvContent = [
      headers.join(','),
      ...file.data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.originalName;
    link.click();
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const handleSort = (column: keyof ImportedFile) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!fileToDelete || !user) return false;

    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password
      });

      if (error) {
        return false; // Invalid password
      }

      // Password is correct, proceed with deletion
      await removeFile(fileToDelete);
      setDeleteModalOpen(false);
      setFileToDelete(null);
      return true;
    } catch (err) {
      console.error('Error verifying password:', err);
      return false;
    }
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue) {
        result = result.filter(file => {
          const value = file[column as keyof ImportedFile];
          if (column === 'dataUpload' && value instanceof Date) {
            return value.toISOString().includes(filterValue);
          }
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = aVal.toString().localeCompare(bVal.toString());
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [files, columnFilters, sortColumn, sortDirection]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCompetencia = (competencia: string) => {
    if (competencia.length === 2) {
      return `${competencia}/2025`;
    }
    return competencia;
  };

  const formatPeriodo = (periodo: string) => {
    // Handle different date formats
    if (periodo.includes('-')) {
      // Check if it's YYYY-MM-DD format
      const parts = periodo.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        // YYYY-MM-DD format
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      } else if (parts.length === 3 && parts[2].length === 4) {
        // DD-MM-YYYY format
        const [day, month, year] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    return periodo;
  };

  const getUniqueColumnValues = (column: keyof ImportedFile) => {
    const values = files.map(file => file[column]).filter(Boolean);
    const uniqueValues = [...new Set(values)];
    
    // For date columns, we need to handle Date objects specially
    if (column === 'dataUpload') {
      return uniqueValues.sort((a, b) => {
        if (a instanceof Date && b instanceof Date) {
          return a.getTime() - b.getTime();
        }
        return 0;
      });
    }
    
    return uniqueValues.sort();
  };

  const SortableHeader: React.FC<{ column: keyof ImportedFile; children: React.ReactNode }> = ({ column, children }) => {
    const uniqueValues = getUniqueColumnValues(column);
    
    return (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
            onClick={() => handleSort(column)}
          >
            <span className="truncate">{children}</span>
            {sortColumn === column && (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ArrowDown className="w-4 h-4 flex-shrink-0" />
              )
            )}
          </div>
          <select
            value={columnFilters[column] || ''}
            onChange={(e) => handleColumnFilter(column, e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Todos</option>
            {uniqueValues.map(value => {
              // Handle Date objects for dataUpload column
              if (column === 'dataUpload' && value instanceof Date) {
                const isoString = value.toISOString();
                const displayValue = formatDate(value);
                return (
                  <option key={isoString} value={isoString}>
                    {displayValue}
                  </option>
                );
              }
              
              // Handle all other values as strings
              const stringValue = value?.toString() || '';
              return (
                <option key={stringValue} value={stringValue}>
                  {stringValue}
                </option>
              );
            })}
          </select>
        </div>
      </th>
    );
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Fixed Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Importação de Dados</h2>
            
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">
              <Upload className="w-4 h-4" />
              {loading ? 'Processando...' : 'Upload Arquivo'}
              <input
                type="file"
                accept=".txt,.csv,.xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
                multiple
              />
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <SortableHeader column="canal">Canal</SortableHeader>
                    <SortableHeader column="tipo">Tipo</SortableHeader>
                    <SortableHeader column="ano">Ano</SortableHeader>
                    <SortableHeader column="competencia">Competência</SortableHeader>
                    <SortableHeader column="periodoInicial">Período Inicial</SortableHeader>
                    <SortableHeader column="periodoFinal">Período Final</SortableHeader>
                    <SortableHeader column="arquivo">Arquivo</SortableHeader>
                    <SortableHeader column="dataUpload">Data Upload</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedFiles.length === 0 ? (
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
                    filteredAndSortedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            file.canal === 'AMAZON' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            file.canal === 'MERCADO LIVRE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            file.canal === 'MAGAZINE LUIZA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            file.canal === 'SHEIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            file.canal === 'SHOPEE' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {file.canal}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{file.tipo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{file.ano}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatCompetencia(file.competencia)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatPeriodo(file.periodoInicial)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatPeriodo(file.periodoFinal)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{file.originalName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(file.dataUpload)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
                              title="Download arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(file.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
                              title="Excluir arquivo"
                            >
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
          </div>
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