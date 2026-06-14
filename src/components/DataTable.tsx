import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { ColumnFilter, FilterBadge } from './ColumnFilter';

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
  columns, data, rowKey, actions, emptyIcon, emptyText = 'Nenhum registro encontrado', emptySubText,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const getOptions = (key: string): string[] =>
    [...new Set(data.map((r: any) => String(r[key] ?? '')))].sort();

  const displayed = [...data]
    .filter(row =>
      Object.entries(colFilters).every(([k, vals]) => {
        if (!vals || vals.length === 0) return true;
        return vals.includes(String((row as any)[k] ?? ''));
      })
    )
    .sort((a: any, b: any) => {
      if (!sortCol) return 0;
      const va = String(a[sortCol] ?? ''), vb = String(b[sortCol] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const handleHeaderClick = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setActiveFilterCol(prev => prev === key ? null : key);
    } else {
      if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortCol(key); setSortDir('asc'); }
    }
  };

  const activeFilters = Object.entries(colFilters).filter(([, v]) => v && v.length > 0);

  const thPx = (col: DataTableColumn) => col.width === 'compact' ? 'px-3' : 'px-6';
  const tdPx = (col: DataTableColumn) => col.width === 'compact' ? 'px-3' : 'px-6';
  const tdWrap = (col: DataTableColumn) =>
    col.width === 'wrap' ? 'break-words min-w-[120px] max-w-[300px] whitespace-normal' : 'whitespace-nowrap';

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20 flex-shrink-0">
          {activeFilters.map(([key, vals]) => {
            const col = columns.find(c => c.key === key);
            return (
              <FilterBadge
                key={key}
                label={col?.label || key}
                count={vals.length}
                onRemove={() => setColFilters(f => { const n = {...f}; delete n[key]; return n; })}
              />
            );
          })}
          {activeFilters.length > 1 && (
            <button onClick={() => setColFilters({})} className="text-xs text-gray-500 hover:text-red-500 underline">
              Limpar todos
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(col => {
                const hasFilter = !!(colFilters[col.key]?.length);
                return (
                  <th
                    key={col.key}
                    ref={el => thRefs.current[col.key] = el}
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
                    <td key={col.key} className={`${tdPx(col)} py-3 text-sm text-gray-900 dark:text-gray-100 ${tdWrap(col)}`}>
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : String((row as any)[col.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-3 whitespace-nowrap">{actions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Column filter popup */}
      {activeFilterCol && (() => {
        const col = columns.find(c => c.key === activeFilterCol)!;
        const anchorRef = { current: thRefs.current[activeFilterCol] } as React.RefObject<HTMLElement>;
        return (
          <ColumnFilter
            column={activeFilterCol}
            label={col?.label || activeFilterCol}
            options={getOptions(activeFilterCol)}
            selected={colFilters[activeFilterCol] || []}
            onChange={vals => setColFilters(f => ({ ...f, [activeFilterCol]: vals }))}
            onClose={() => setActiveFilterCol(null)}
            anchorRef={anchorRef}
          />
        );
      })()}
    </div>
  );
}
