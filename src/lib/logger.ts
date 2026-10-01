// ── Log do app (memória + sessionStorage) — exibido no botão LOG do rodapé ────
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  time: string; // ISO
  level: LogLevel;
  source: string; // ex.: 'importacao', 'request', 'app'
  message: string;
  details?: string;
}

const MAX_ENTRIES = 500;
const STORAGE_KEY = 'feex:logs';
let _seq = 0;
let _entries: LogEntry[] = [];

try {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    _entries = JSON.parse(saved);
    _seq = _entries.reduce((m, e) => Math.max(m, e.id), 0);
  }
} catch { /* ignore */ }

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_entries)); } catch { /* ignore */ }
  }, 500);
}

function toDetails(details: unknown): string | undefined {
  if (details == null) return undefined;
  if (typeof details === 'string') return details;
  if (details instanceof Error) return `${details.name}: ${details.message}`;
  try { return JSON.stringify(details, null, 2); } catch { return String(details); }
}

export function log(level: LogLevel, source: string, message: string, details?: unknown) {
  const entry: LogEntry = {
    id: ++_seq,
    time: new Date().toISOString(),
    level,
    source,
    message,
    details: toDetails(details),
  };
  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) _entries = _entries.slice(-MAX_ENTRIES);
  persist();
  window.dispatchEvent(new CustomEvent('feex:log'));
  if (level === 'error') console.error(`[${source}] ${message}`, details ?? '');
}

export const logger = {
  info: (source: string, message: string, details?: unknown) => log('info', source, message, details),
  warn: (source: string, message: string, details?: unknown) => log('warn', source, message, details),
  error: (source: string, message: string, details?: unknown) => log('error', source, message, details),
};

export function getLogs(): LogEntry[] {
  return _entries;
}

export function clearLogs() {
  _entries = [];
  persist();
  window.dispatchEvent(new CustomEvent('feex:log'));
}

export function logsAsText(entries: LogEntry[] = _entries): string {
  return entries
    .map(e => {
      const t = new Date(e.time).toLocaleString('pt-BR');
      return `[${t}] ${e.level.toUpperCase()} (${e.source}) ${e.message}${e.details ? '\n  ' + e.details.replace(/\n/g, '\n  ') : ''}`;
    })
    .join('\n');
}

// ── Erros não tratados ────────────────────────────────────────────────────────
window.addEventListener('error', ev => {
  log('error', 'app', ev.message || 'Erro não tratado', ev.error ?? `${ev.filename}:${ev.lineno}`);
});
window.addEventListener('unhandledrejection', ev => {
  log('error', 'app', 'Promise rejeitada sem tratamento', ev.reason);
});

// ── Requisições ao Supabase ───────────────────────────────────────────────────
/** Descreve a requisição sem expor tokens nem conteúdo enviado. */
function describeRequest(url: string, method: string): string {
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p.startsWith('/rest/v1/rpc/')) return `${method} rpc ${p.replace('/rest/v1/rpc/', '')}`;
    if (p.startsWith('/rest/v1/')) {
      const table = p.replace('/rest/v1/', '');
      const id = u.searchParams.get('id');
      return `${method} ${table}${id ? ' ' + id.replace(/^eq\./, 'id=') : ''}`;
    }
    if (p.startsWith('/auth/v1/')) return `${method} auth ${p.replace('/auth/v1/', '')}`;
    if (p.startsWith('/functions/v1/')) return `${method} function ${p.replace('/functions/v1/', '')}`;
    if (p.startsWith('/storage/v1/')) return `${method} storage ${p.replace('/storage/v1/', '')}`;
    return `${method} ${p}`;
  } catch {
    return `${method} ${url}`;
  }
}

/** fetch com log de cada requisição (método, recurso, status, tempo, erro). */
export const loggedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const what = describeRequest(url, method);
  const isAuth = url.includes('/auth/v1/');
  const started = performance.now();
  try {
    const res = await fetch(input, init);
    const ms = Math.round(performance.now() - started);
    if (res.ok) {
      log(ms > 5000 ? 'warn' : 'info', 'request', `${what} → ${res.status} (${ms} ms)${ms > 5000 ? ' — lenta' : ''}`);
    } else {
      let body = '';
      try { body = isAuth ? '' : (await res.clone().text()).slice(0, 1000); } catch { /* ignore */ }
      log('error', 'request', `${what} → ${res.status} (${ms} ms)`, body || undefined);
    }
    return res;
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    log('error', 'request', `${what} → falha de rede (${ms} ms)`, err);
    throw err;
  }
};
