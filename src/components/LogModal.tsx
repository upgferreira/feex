import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy, Trash2, Check } from 'lucide-react';
import { getLogs, clearLogs, logsAsText, LogEntry, LogLevel } from '../lib/logger';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Filter = 'todos' | 'erros' | 'importacao' | 'request';

const levelStyle: Record<LogLevel, string> = {
  info: 'text-gray-500 dark:text-gray-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LogEntry[]>(getLogs());
  const [filter, setFilter] = useState<Filter>('todos');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setEntries([...getLogs()]);
    window.addEventListener('feex:log', handler);
    return () => window.removeEventListener('feex:log', handler);
  }, []);

  const filtered = useMemo(() => {
    const list = entries.filter(e =>
      filter === 'todos' ? true :
      filter === 'erros' ? e.level !== 'info' :
      e.source === filter
    );
    return [...list].reverse();
  }, [entries, filter]);

  if (!isOpen) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logsAsText([...filtered].reverse()));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const tab = (f: Filter, label: string) => (
    <button onClick={() => setFilter(f)}
      className={'px-3 py-1 text-xs rounded ' + (filter === f
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 h-full w-full max-w-3xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log</h3>
          <div className="flex items-center gap-2">
            <button onClick={copy} title="Copiar log (para enviar ao suporte)"
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={clearLogs} title="Limpar log"
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {tab('todos', 'Todos')}
          {tab('erros', 'Erros e avisos')}
          {tab('importacao', 'Importação')}
          {tab('request', 'Requisições')}
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} registro(s) · desta aba do navegador</span>
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-gray-400 font-sans text-sm">Nada registrado ainda.</div>
          )}
          {filtered.map(e => (
            <div key={e.id}
              onClick={() => e.details && setExpanded(expanded === e.id ? null : e.id)}
              className={'px-4 py-1.5 border-b border-gray-100 dark:border-gray-700/50 ' + (e.details ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40' : '')}>
              <div className="flex gap-2">
                <span className="text-gray-400 shrink-0">{new Date(e.time).toLocaleTimeString('pt-BR')}</span>
                <span className={'shrink-0 w-12 font-semibold ' + levelStyle[e.level]}>{e.level.toUpperCase()}</span>
                <span className="shrink-0 w-20 text-gray-400">{e.source}</span>
                <span className={'break-all ' + (e.level === 'info' ? 'text-gray-700 dark:text-gray-200' : levelStyle[e.level])}>
                  {e.message}{e.details && <span className="text-gray-400"> {expanded === e.id ? '▾' : '▸'}</span>}
                </span>
              </div>
              {expanded === e.id && e.details && (
                <pre className="mt-1 ml-[8.5rem] p-2 rounded bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">{e.details}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
