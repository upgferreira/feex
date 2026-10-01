import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy, Trash2, Check, Search } from 'lucide-react';
import { getLogs, clearLogs, logsAsText, LogEntry, LogLevel, LogModule, LOG_MODULES } from '../lib/logger';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'geral' | LogModule;

interface ActionStats {
  action: string;
  module: LogModule;
  total: number;
  errors: number;
  warns: number;
  requests: number;
  avgMs: number | null;
  maxMs: number | null;
  last: string;
}

const levelStyle: Record<LogLevel, string> = {
  info: 'text-gray-500 dark:text-gray-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

const moduleLabel = (m: LogModule) => LOG_MODULES.find(x => x.key === m)?.label || m;

function buildStats(entries: LogEntry[]): ActionStats[] {
  const map = new Map<string, ActionStats & { msSum: number; msCount: number }>();
  for (const e of entries) {
    const key = e.module + '|' + e.action;
    let s = map.get(key);
    if (!s) {
      s = { action: e.action, module: e.module, total: 0, errors: 0, warns: 0, requests: 0, avgMs: null, maxMs: null, last: e.time, msSum: 0, msCount: 0 };
      map.set(key, s);
    }
    s.total++;
    if (e.level === 'error') s.errors++;
    if (e.level === 'warn') s.warns++;
    if (e.kind === 'request') s.requests++;
    if (e.ms != null) {
      s.msSum += e.ms; s.msCount++;
      s.maxMs = Math.max(s.maxMs ?? 0, e.ms);
    }
    if (e.time > s.last) s.last = e.time;
  }
  return Array.from(map.values())
    .map(({ msSum, msCount, ...s }) => ({ ...s, avgMs: msCount ? Math.round(msSum / msCount) : null }))
    .sort((a, b) => b.errors - a.errors || b.total - a.total);
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LogEntry[]>(getLogs());
  const [tab, setTab] = useState<Tab>('geral');
  const [action, setAction] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setEntries([...getLogs()]);
    window.addEventListener('feex:log', handler);
    return () => window.removeEventListener('feex:log', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const moduleEntries = useMemo(
    () => (tab === 'geral' ? entries : entries.filter(e => e.module === tab)),
    [entries, tab]
  );
  const stats = useMemo(() => buildStats(moduleEntries), [moduleEntries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return moduleEntries
      .filter(e => !action || e.module + '|' + e.action === action)
      .filter(e => !onlyProblems || e.level !== 'info')
      .filter(e => !q || (e.message + ' ' + e.action + ' ' + (e.details || '')).toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [moduleEntries, action, onlyProblems, search]);

  const perModule = useMemo(() => {
    const r: Record<string, { total: number; errors: number }> = {};
    for (const e of entries) {
      r[e.module] = r[e.module] || { total: 0, errors: 0 };
      r[e.module].total++;
      if (e.level === 'error') r[e.module].errors++;
    }
    return r;
  }, [entries]);

  if (!isOpen) return null;

  const selectTab = (t: Tab) => { setTab(t); setAction(null); setExpanded(null); };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logsAsText([...visible].reverse()));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const tabBtn = (t: Tab, label: string, total: number, errors: number) => (
    <button key={t} onClick={() => selectTab(t)}
      className={'flex items-center gap-1.5 px-3 h-full text-sm border-b-2 whitespace-nowrap transition-colors ' + (tab === t
        ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')}>
      {label}
      <span className="text-xs text-gray-400">{total}</span>
      {errors > 0 && <span className="min-w-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">{errors}</span>}
    </button>
  );

  const currentDesc = tab === 'geral'
    ? 'Tudo o que aconteceu nesta aba do navegador, agrupado pelo que cada ação faz.'
    : LOG_MODULES.find(m => m.key === tab)?.desc;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white dark:bg-gray-900">
      {/* ── Header: módulos ── */}
      <div className="flex items-stretch h-12 border-b border-gray-200 dark:border-gray-700 px-4 gap-4 shrink-0">
        <div className="flex items-center font-semibold text-gray-900 dark:text-white pr-2">Log</div>
        <div className="flex items-stretch overflow-x-auto flex-1">
          {tabBtn('geral', 'Visão geral', entries.length, entries.filter(e => e.level === 'error').length)}
          {LOG_MODULES.map(m => tabBtn(m.key, m.label, perModule[m.key]?.total || 0, perModule[m.key]?.errors || 0))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copy} title="Copia o que está na tela (para enviar ao suporte)"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button onClick={() => clearLogs(tab === 'geral' ? undefined : tab)}
            title={tab === 'geral' ? 'Limpar todo o log' : `Limpar só ${moduleLabel(tab)}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
          <button onClick={onClose} title="Fechar (Esc)" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400">{currentDesc}</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={onlyProblems} onChange={e => setOnlyProblems(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            Só erros e avisos
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar (arquivo, id, mensagem)"
              className="pl-7 pr-2 py-1 w-64 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── O que cada ação faz (resumo) ── */}
        <aside className="w-80 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wide text-gray-400">Ações</div>
          <button onClick={() => setAction(null)}
            className={'w-full text-left px-4 py-2 text-sm ' + (!action ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            Todas as ações <span className="text-xs text-gray-400">({moduleEntries.length})</span>
          </button>
          {stats.length === 0 && <div className="px-4 py-3 text-xs text-gray-400">Nada registrado ainda.</div>}
          {stats.map(s => {
            const key = s.module + '|' + s.action;
            const active = action === key;
            return (
              <button key={key} onClick={() => setAction(active ? null : key)}
                className={'w-full text-left px-4 py-2 border-t border-gray-100 dark:border-gray-800 ' + (active ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
                <div className="flex items-center gap-2">
                  <span className={'text-sm truncate ' + (s.errors ? 'text-red-600 dark:text-red-400' : active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100')}>
                    {s.action}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">{s.total}×</span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-400 mt-0.5">
                  {tab === 'geral' && <span>{moduleLabel(s.module)}</span>}
                  {s.avgMs != null && <span>média {s.avgMs} ms</span>}
                  {s.maxMs != null && <span className={s.maxMs > 5000 ? 'text-amber-600' : ''}>máx {s.maxMs} ms</span>}
                  {s.errors > 0 && <span className="text-red-600">{s.errors} erro(s)</span>}
                  {s.warns > 0 && <span className="text-amber-600">{s.warns} aviso(s)</span>}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Registros ── */}
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          <div className="sticky top-0 flex gap-3 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 text-[11px] uppercase tracking-wide text-gray-400 font-sans border-b border-gray-200 dark:border-gray-700">
            <span className="w-16">Hora</span>
            <span className="w-12">Nível</span>
            <span className="w-56">Ação</span>
            <span className="flex-1">Mensagem</span>
          </div>
          {visible.length === 0 && (
            <div className="p-8 text-center text-gray-400 font-sans text-sm">Nenhum registro com esses filtros.</div>
          )}
          {visible.map(e => (
            <div key={e.id}
              onClick={() => e.details && setExpanded(expanded === e.id ? null : e.id)}
              className={'px-4 py-1.5 border-b border-gray-100 dark:border-gray-800 ' + (e.details ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60' : '')}>
              <div className="flex gap-3">
                <span className="w-16 shrink-0 text-gray-400">{new Date(e.time).toLocaleTimeString('pt-BR')}</span>
                <span className={'w-12 shrink-0 font-semibold ' + levelStyle[e.level]}>{e.level.toUpperCase()}</span>
                <span className="w-56 shrink-0 truncate text-gray-500 dark:text-gray-400" title={`${moduleLabel(e.module)} › ${e.action}`}>
                  {tab === 'geral' && <span className="text-gray-400">{moduleLabel(e.module)} › </span>}{e.action}
                </span>
                <span className={'flex-1 break-all ' + (e.level === 'info' ? 'text-gray-700 dark:text-gray-200' : levelStyle[e.level])}>
                  {e.message}{e.details && <span className="text-gray-400"> {expanded === e.id ? '▾' : '▸'}</span>}
                </span>
              </div>
              {expanded === e.id && e.details && (
                <pre className="mt-1 ml-[19.5rem] p-2 rounded bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">{e.details}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
