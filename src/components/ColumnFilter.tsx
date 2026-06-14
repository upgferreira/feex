import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

interface ColumnFilterProps {
  column: string;
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export const ColumnFilter: React.FC<ColumnFilterProps> = ({
  column, label, options, selected, onChange, onClose, anchorRef,
}) => {
  const [search, setSearch] = useState('');
  const [local, setLocal] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  // Position relative to anchor (th element)
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(o => local.includes(o));

  const toggle = (val: string) => {
    setLocal(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const toggleAll = () => {
    if (allSelected) setLocal(prev => prev.filter(v => !filtered.includes(v)));
    else setLocal(prev => [...new Set([...prev, ...filtered])]);
  };

  const apply = () => { onChange(local); onClose(); };
  const clear = () => { setLocal([]); onChange([]); onClose(); };

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-72"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{label}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          <Search className="w-3 h-3 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-gray-400" /></button>}
        </div>
      </div>

      {/* Select all */}
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1 py-0.5">
          <div onClick={toggleAll}
            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
              allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
            }`}>
            {allSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Todos</span>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} valores</span>
        </label>
      </div>

      {/* Options */}
      <div className="max-h-48 overflow-y-auto">
        {filtered.map(opt => (
          <label key={opt} className="flex items-center gap-2 px-4 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <div onClick={() => toggle(opt)}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                local.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
              }`}>
              {local.includes(opt) && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{opt || '(em branco)'}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum resultado</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        <button onClick={apply}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
          <Check className="w-3 h-3" /> Aplicar
        </button>
        <button onClick={clear}
          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium rounded hover:bg-red-100 border border-red-200 dark:border-red-800">
          <X className="w-3 h-3" /> Limpar
        </button>
      </div>
    </div>
  );
};

// Active filter badge
export const FilterBadge: React.FC<{ label: string; count: number; onRemove: () => void }> = ({ label, count, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
    {label}: {count}
    <button onClick={onRemove} className="hover:text-blue-900 dark:hover:text-blue-200">
      <X className="w-3 h-3" />
    </button>
  </span>
);
