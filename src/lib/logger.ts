// ── Log do app (memória + sessionStorage) — exibido no botão LOG do rodapé ────
export type LogLevel = 'info' | 'warn' | 'error';

export type LogModule = 'importacao' | 'dados' | 'exportacao' | 'cadastros' | 'bling' | 'conta' | 'sistema';

export const LOG_MODULES: { key: LogModule; label: string; desc: string }[] = [
  { key: 'importacao', label: 'Importação', desc: 'Leitura, validação e envio das planilhas para o servidor' },
  { key: 'dados', label: 'Dados', desc: 'Lista de arquivos e carregamento dos dados para o dashboard/tabela' },
  { key: 'exportacao', label: 'Exportação', desc: 'Geração dos arquivos para Bling/Olist e histórico de exportações' },
  { key: 'cadastros', label: 'Cadastros', desc: 'Categorias, contas, métodos e mapeamentos salvos na FEEX' },
  { key: 'bling', label: 'Bling', desc: 'Chamadas às funções de integração com a API do Bling' },
  { key: 'conta', label: 'Conta e acesso', desc: 'Login, sessão, cadastro e perfil do usuário' },
  { key: 'sistema', label: 'Sistema', desc: 'Erros inesperados do app e chamadas não classificadas' },
];

export interface LogEntry {
  id: number;
  time: string; // ISO
  level: LogLevel;
  module: LogModule;
  action: string; // o que foi feito, ex.: 'Carregar dados do arquivo'
  message: string;
  details?: string;
  ms?: number; // duração (requisições)
  status?: number; // HTTP status (requisições)
  kind: 'request' | 'event';
}

const MAX_ENTRIES = 1000;
const STORAGE_KEY = 'feex:logs:v2';
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

let _notifyTimer: ReturnType<typeof setTimeout> | null = null;
function notify() {
  if (_notifyTimer) return;
  _notifyTimer = setTimeout(() => {
    _notifyTimer = null;
    window.dispatchEvent(new CustomEvent('feex:log'));
  }, 100);
}

function toDetails(details: unknown): string | undefined {
  if (details == null) return undefined;
  if (typeof details === 'string') return details;
  if (details instanceof Error) return `${details.name}: ${details.message}`;
  try { return JSON.stringify(details, null, 2); } catch { return String(details); }
}

function push(e: Omit<LogEntry, 'id' | 'time'>) {
  const entry: LogEntry = { ...e, id: ++_seq, time: new Date().toISOString() };
  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) _entries = _entries.slice(-MAX_ENTRIES);
  persist();
  notify();
  if (e.level === 'error') console.error(`[${e.module} · ${e.action}] ${e.message}`, e.details ?? '');
}

/** Registra um evento do app. `action` descreve o que estava sendo feito. */
export function log(level: LogLevel, module: LogModule, action: string, message: string, details?: unknown) {
  push({ level, module, action, message, details: toDetails(details), kind: 'event' });
}

export const logger = {
  info: (module: LogModule, action: string, message: string, details?: unknown) => log('info', module, action, message, details),
  warn: (module: LogModule, action: string, message: string, details?: unknown) => log('warn', module, action, message, details),
  error: (module: LogModule, action: string, message: string, details?: unknown) => log('error', module, action, message, details),
};

export function getLogs(): LogEntry[] {
  return _entries;
}

export function clearLogs(module?: LogModule) {
  _entries = module ? _entries.filter(e => e.module !== module) : [];
  persist();
  window.dispatchEvent(new CustomEvent('feex:log'));
}

export function logsAsText(entries: LogEntry[] = _entries): string {
  return entries
    .map(e => {
      const t = new Date(e.time).toLocaleString('pt-BR');
      return `[${t}] ${e.level.toUpperCase()} ${e.module} › ${e.action} — ${e.message}${e.details ? '\n  ' + e.details.replace(/\n/g, '\n  ') : ''}`;
    })
    .join('\n');
}

// ── Erros não tratados ────────────────────────────────────────────────────────
window.addEventListener('error', ev => {
  log('error', 'sistema', 'Erro inesperado', ev.message || 'Erro não tratado', ev.error ?? `${ev.filename}:${ev.lineno}`);
});
window.addEventListener('unhandledrejection', ev => {
  log('error', 'sistema', 'Erro inesperado', 'Promise rejeitada sem tratamento', ev.reason);
});

// ── Classificação das requisições por módulo/ação ─────────────────────────────
const VERB: Record<string, string> = { GET: 'Ler', POST: 'Criar', PATCH: 'Atualizar', PUT: 'Atualizar', DELETE: 'Excluir' };

const TABLE_MODULE: Record<string, { module: LogModule; label: string }> = {
  financial_categories: { module: 'cadastros', label: 'categorias' },
  financial_accounts: { module: 'cadastros', label: 'contas' },
  financial_methods: { module: 'cadastros', label: 'métodos' },
  bling_tokens: { module: 'bling', label: 'token do Bling' },
};

const BLING_ENTITY: [RegExp, string][] = [
  [/CategoriasFinanceiras/, 'categorias'],
  [/ContasFinanceiras/, 'contas'],
  [/MetodosFinanceiros/, 'métodos'],
  [/Caixas/, 'caixas'],
  [/Token/, 'token'],
];

function classify(url: string, method: string): { module: LogModule; action: string; target: string } {
  let u: URL;
  try { u = new URL(url); } catch { return { module: 'sistema', action: `${method} externo`, target: url }; }
  const p = u.pathname;
  const verb = VERB[method] || method;

  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.replace('/rest/v1/rpc/', '');
    if (fn === 'append_file_data') return { module: 'importacao', action: 'Enviar bloco de dados', target: fn };
    return { module: 'sistema', action: `RPC ${fn}`, target: fn };
  }

  if (p.startsWith('/rest/v1/')) {
    const table = p.replace('/rest/v1/', '');
    const id = u.searchParams.get('id')?.replace(/^eq\./, '');
    const target = table + (id ? ` id=${id}` : '');
    const select = u.searchParams.get('select') || '';

    if (table === 'imported_files') {
      if (method === 'GET') return id
        ? { module: 'dados', action: 'Carregar dados do arquivo', target }
        : { module: 'dados', action: 'Listar arquivos importados', target };
      if (method === 'POST') return { module: 'importacao', action: 'Criar registro do arquivo', target };
      if (method === 'PATCH') return { module: 'importacao', action: 'Gravar dados do arquivo', target };
      if (method === 'DELETE') return { module: 'importacao', action: 'Excluir arquivo', target };
    }
    if (table === 'exported_files') {
      if (method === 'GET') return { module: 'exportacao', action: 'Ler histórico de exportações', target };
      if (method === 'POST') return { module: 'exportacao', action: 'Registrar exportação', target };
      return { module: 'exportacao', action: `${verb} registro de exportação`, target };
    }
    if (table === 'user_profiles') {
      if (method === 'GET') return select.includes('is_admin') && !select.includes('*')
        ? { module: 'conta', action: 'Verificar permissão de admin', target }
        : { module: 'conta', action: 'Ler perfil', target };
      return { module: 'conta', action: `${verb} perfil`, target };
    }
    const m = TABLE_MODULE[table];
    if (m) return { module: m.module, action: `${verb} ${m.label}`, target };
    return { module: 'sistema', action: `${verb} ${table}`, target };
  }

  if (p.startsWith('/auth/v1/')) {
    const ep = p.replace('/auth/v1/', '');
    const grant = u.searchParams.get('grant_type');
    const action =
      ep === 'token' && grant === 'password' ? 'Login' :
      ep === 'token' && grant === 'refresh_token' ? 'Renovar sessão' :
      ep === 'signup' ? 'Cadastro' :
      ep === 'logout' ? 'Logout' :
      ep === 'verify' || ep === 'otp' ? 'Confirmação de email' :
      ep === 'recover' ? 'Recuperar senha' :
      ep === 'user' ? (method === 'GET' ? 'Ler usuário' : 'Atualizar usuário (senha/email)') :
      `Auth ${ep}`;
    return { module: 'conta', action, target: `auth/${ep}` };
  }

  if (p.startsWith('/functions/v1/')) {
    const fn = p.replace('/functions/v1/', '');
    if (fn.startsWith('bling_')) {
      const op = /^bling_(get|post|put|delete)/.exec(fn)?.[1] || '';
      const opLabel = { get: 'Ler', post: 'Criar', put: 'Atualizar', delete: 'Excluir' }[op] || 'Chamar';
      const entity = BLING_ENTITY.find(([re]) => re.test(fn))?.[1] || fn.replace(/^bling_/, '');
      return { module: 'bling', action: `${opLabel} ${entity} no Bling`, target: fn };
    }
    return { module: 'sistema', action: `Função ${fn}`, target: fn };
  }

  return { module: 'sistema', action: `${verb} ${u.host}`, target: u.host + p };
}

// ── fetch com log (sem tokens, sem conteúdo enviado) ──────────────────────────
const nativeFetch: typeof fetch = window.fetch.bind(window);

export const loggedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const { module, action, target } = classify(url, method);
  const isAuth = url.includes('/auth/v1/');
  const started = performance.now();
  try {
    const res = await nativeFetch(input, init);
    const ms = Math.round(performance.now() - started);
    if (res.ok) {
      const slow = ms > 5000;
      push({ level: slow ? 'warn' : 'info', module, action, kind: 'request', ms, status: res.status,
        message: `${method} ${target} → ${res.status} (${ms} ms)${slow ? ' — lenta' : ''}` });
    } else {
      let body = '';
      try { body = isAuth ? '' : (await res.clone().text()).slice(0, 1000); } catch { /* ignore */ }
      push({ level: 'error', module, action, kind: 'request', ms, status: res.status,
        message: `${method} ${target} → ${res.status} (${ms} ms)`, details: body || undefined });
    }
    return res;
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    push({ level: 'error', module, action, kind: 'request', ms,
      message: `${method} ${target} → falha de rede (${ms} ms)`, details: toDetails(err) });
    throw err;
  }
};

// Captura também as chamadas feitas com fetch direto (ex.: funções do Bling)
window.fetch = loggedFetch;
