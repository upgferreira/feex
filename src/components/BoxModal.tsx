import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { FullscreenModal } from './FullscreenModal';
import { useAdmin } from '../hooks/useAdmin';

interface BoxModalProps { isOpen: boolean; onClose: () => void; }

export const BoxModal: React.FC<BoxModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAccounts } = useAdmin();

  useEffect(() => {
    if (isOpen) { setLoading(true); getAccounts().then(setAccounts).catch(console.error).finally(() => setLoading(false)); }
  }, [isOpen]);

  const filtered = accounts.filter(a =>
    [a.canal, a.caixa, a.fornecedor_nome_fantasia, a.fornecedor_razao_social, a.fornecedor_cnpj]
      .some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const COLS = [
    { key: 'canal', label: 'Canal' },
    { key: 'caixa', label: 'Caixa' },
    { key: 'fornecedor_nome_fantasia', label: 'Nome Fantasia' },
    { key: 'fornecedor_razao_social', label: 'Razão Social' },
    { key: 'fornecedor_cnpj', label: 'CNPJ' },
  ];

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Mapeamento de Caixas">
      <div className="flex flex-col h-full">
        <div className="px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar caixas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  {COLS.map(c => (
                    <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {COLS.map(c => (
                      <td key={c.key} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {a[c.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-8 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} registro(s) · Pressione ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
