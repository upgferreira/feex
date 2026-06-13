import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, Filter } from 'lucide-react';

export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  width?: 'auto' | 'compact' | 'wide' | 'wrap';
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  emptySubText?: string;
}

function FormatBadge({ value }: { value: string }) {
  const cls =
    value === 'CSV'  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
    value === 'XLSX' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
    value === 'XLS'  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
    value === 'OFX'  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                       'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value}</span>;
}

export { FormatBadge };

export function DataTable<T = any>({
  columns,
  data,
  rowKey,
  actions,
  emptyIcon,
  emptyText = 'Nenhum registro encontrado',
  emptySubText,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setActiveFilterCol(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleHeaderClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setActiveFilterCol(prev => prev === key ? null : key);
    } else {
      if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortCol(key); setSortDir('asc'); }
    }
  };

  const getOptions = (key: string) =>
    [...new Set(data.map((r: any) => r[key]).filter(Boolean))].sort();

  const displayed = [...data]
    .filter(row =>
      Object.entries(colFilters).every(([k, v]) =>
        !v || String((row as any)[k] ?? '').toLowerCase().includes(v.toLowerCase())
      )
    )
    .sort((a: any, b: any) => {
      if (!sortCol) return 0;
      const va = String(a[sortCol] ?? ''), vb = String(b[sortCol] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const thPx = (col: DataTableColumn) =>
    col.width === 'compact' ? 'px-3' : 'px-6';
  const tdPx = (col: DataTableColumn) =>
    col.width === 'compact' ? 'px-3' : 'px-6';
  const tdWrap = (col: DataTableColumn) =>
    col.width === 'wrap' ? 'break-words min-w-[160px] max-w-xs' : 'whitespace-nowrap';

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(col => {
                const hasFilter = !!colFilters[col.key];
                return (
                  <th
                    key={col.key}
                    className={`${thPx(col)} py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none transition-colors whitespace-nowrap ${
                      hasFilter
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onClick={e => handleHeaderClick(e, col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortCol === col.key && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      {hasFilter && <Filter className="w-3 h-3" />}
                    </div>
                  </th>
                );
              })}
              {actions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-16 text-center">
                  {emptyIcon && <div className="flex justify-center mb-4 text-gray-400">{emptyIcon}</div>}
                  <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyText}</p>
                  {emptySubText && <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">{emptySubText}</p>}
                </td>
              </tr>
            ) : (
              displayed.map(row => (
                <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  {columns.map(col => (
                    <td key={col.key} className={`${tdPx(col)} py-4 text-sm text-gray-900 dark:text-gray-100 ${tdWrap(col)}`}>
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : String((row as any)[col.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ctrl+click filter popup */}
      {activeFilterCol && (
        <div ref={filterRef} className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {columns.find(c => c.key === activeFilterCol)?.label}
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
            {getOptions(activeFilterCol).map(v => (
              <option key={String(v)} value={String(v)}>{String(v)}</option>
            ))}
          </select>
          {colFilters[activeFilterCol] && (
            <button
              onClick={() => setColFilters(f => ({ ...f, [activeFilterCol!]: '' }))}
              className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
