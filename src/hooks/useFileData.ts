import { useState, useCallback, useEffect, useRef } from 'react';
import { ImportedFile, DataRow } from '../types';
import { parseFileName, parseCSV, detectCSVDelimiter, detectSingleColumnCSV, splitSingleColumnCSV } from '../utils/fileParser';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '../lib/logger';
import * as XLSX from 'xlsx';

// ── Module-level cache (persists across re-renders, resets on page reload) ────
let _cache: ImportedFile[] | null = null;
let _cacheUserId: string | null = null;
let _listeners: (() => void)[] = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

// ── Persistent cache (IndexedDB) — arquivos importados são imutáveis por id ──
const IDB_NAME = 'feex-cache';
const IDB_STORE = 'file_data';
let _idbPromise: Promise<IDBDatabase | null> | null = null;

function idbOpen(): Promise<IDBDatabase | null> {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return _idbPromise;
}

async function idbReq<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = fn(db.transaction(IDB_STORE, mode).objectStore(IDB_STORE));
      req.onsuccess = () => resolve((req.result ?? null) as T | null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

type CachedFileData = { data: DataRow[]; columns: string[] };
const idbGet = (id: string) => idbReq<CachedFileData>('readonly', st => st.get(id));
const idbSet = (id: string, value: CachedFileData) => idbReq('readwrite', st => st.put(value, id));
const idbDel = (id: string) => idbReq('readwrite', st => st.delete(id));
const idbKeys = () => idbReq<IDBValidKey[]>('readonly', st => st.getAllKeys());

/** Limpa o cache local (usar no logout). */
export async function clearFileDataCache() {
  _loaded.clear();
  _cache = null;
  _cacheUserId = null;
  const db = await idbOpen();
  if (db) await idbReq('readwrite', st => st.clear());
}

// ── Carregamento sob demanda + progresso ──────────────────────────────────────
const _loaded = new Set<string>();
const _inflight = new Map<string, Promise<void>>();
let _progressDone = 0;
let _progressTotal = 0;
const CONCURRENCY = 2;

export type LoadProgress = { done: number; total: number } | null;
export function getLoadProgress(): LoadProgress {
  return _progressTotal > 0 ? { done: _progressDone, total: _progressTotal } : null;
}
function emitProgress() {
  window.dispatchEvent(new CustomEvent('feex:load-progress'));
}

export function isFileLoaded(id: string) {
  return _loaded.has(id);
}

/**
 * Corrige linhas salvas como texto: versões antigas enviavam cada bloco de 5.000 linhas
 * como string JSON (ex.: ["[{...},...]", "[{...}]"]). Aqui expande de volta para objetos.
 */
function normalizeRows(raw: unknown): DataRow[] {
  if (!Array.isArray(raw)) return [];
  if (!raw.some(r => typeof r === 'string')) return raw as DataRow[];
  const out: DataRow[] = [];
  for (const r of raw) {
    if (typeof r === 'string') {
      try {
        const parsed = JSON.parse(r);
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed && typeof parsed === 'object') out.push(parsed);
      } catch { /* ignora bloco inválido */ }
    } else if (r && typeof r === 'object') {
      out.push(r as DataRow);
    }
  }
  return out;
}

/** Traduz erros do Supabase/rede para uma mensagem que o usuário entende. */
export function describeError(err: any): string {
  const code = err?.code;
  const msg = String(err?.message || err || '');
  if (code === '23505') return 'Arquivo já importado. Este período já existe na FEEX. Delete o arquivo atual antes de reimportar.';
  if (code === '57014' || /statement timeout/i.test(msg)) return 'O servidor demorou demais para processar (timeout). Tente novamente; se persistir, divida o arquivo em períodos menores.';
  if (code === 'PGRST301' || /JWT|token/i.test(msg)) return 'Sua sessão expirou. Saia e entre novamente.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Falha de conexão com o servidor. Verifique a internet e tente novamente.';
  if (/payload|too large|413/i.test(msg)) return 'Arquivo grande demais para enviar de uma vez.';
  if (/row-level security|permission denied|42501/i.test(msg)) return 'Sem permissão para gravar este arquivo. Entre novamente ou fale com o suporte.';
  return msg || 'Erro desconhecido';
}

async function loadOne(id: string) {
  const f = _cache?.find(x => x.id === id);
  if (!f) return;
  const cached = await idbGet(id);
  if (cached) {
    f.data = normalizeRows(cached.data);
    f.columns = cached.columns?.length ? cached.columns : f.columns;
    _loaded.add(id);
    return;
  }
  const started = performance.now();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { data: fd, error } = await supabase
      .from('imported_files')
      .select('id, file_data, file_headers')
      .eq('id', id)
      .single();
    if (!error && fd) {
      f.data = normalizeRows(fd.file_data);
      f.columns = fd.file_headers || f.columns;
      _loaded.add(id);
      idbSet(id, { data: f.data, columns: f.columns });
      logger.info('dados', `Carregado ${f.originalName || f.arquivo} (${f.data.length} linhas, ${Math.round(performance.now() - started)} ms)`);
      return;
    }
    logger.warn('dados', `Falha ao carregar ${f.originalName || f.arquivo} (tentativa ${attempt}/2): ${describeError(error)}`, error);
    if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
  }
  logger.error('dados', `Não foi possível carregar ${f.originalName || f.arquivo}. Os dados dele não aparecem até recarregar a página.`);
}

/** Garante que os dados dos arquivos informados estejam carregados (cache → banco). */
export async function ensureFileData(ids: string[]): Promise<ImportedFile[]> {
  const pending = ids.filter(id => !_loaded.has(id) && !_inflight.has(id));
  const waiting = ids.filter(id => _inflight.has(id)).map(id => _inflight.get(id)!);

  if (pending.length) {
    _progressTotal += pending.length;
    emitProgress();
    const queue = [...pending];
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift()!;
        const p = loadOne(id).catch(err => console.error('Erro ao carregar arquivo', id, err));
        _inflight.set(id, p);
        await p;
        _inflight.delete(id);
        _progressDone++;
        emitProgress();
      }
    };
    waiting.push(...Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  }

  await Promise.all(waiting);

  if (pending.length) {
    if (_inflight.size === 0) { _progressDone = 0; _progressTotal = 0; emitProgress(); }
    if (_cache) _cache = [..._cache];
    window.dispatchEvent(new CustomEvent('feex:files-updated'));
    notifyListeners();
  }
  return (_cache || []).filter(f => ids.includes(f.id));
}

// ── Período coberto por um arquivo (ISO yyyy-mm-dd) ───────────────────────────
function brToIso(v: string | undefined): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((v || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function fileRange(f: ImportedFile): { start: string; end: string } | null {
  const m = /^(\d{2})-(\d{4})$/.exec((f.competencia || '').trim());
  const compStart = m ? `${m[2]}-${m[1]}-01` : null;
  const compEnd = m ? new Date(+m[2], +m[1], 0).toISOString().split('T')[0] : null;
  const start = brToIso(f.periodoInicial) || compStart;
  const end = brToIso(f.periodoFinal) || compEnd;
  return start && end ? { start, end } : null;
}

/** true se o arquivo cobre (parte de) o período. Período vazio = tudo. */
export function fileOverlaps(f: ImportedFile, startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return true;
  const r = fileRange(f);
  if (!r) return true; // período desconhecido: carrega para não perder dados
  if (startDate && r.end < startDate) return false;
  if (endDate && r.start > endDate) return false;
  return true;
}

/** Período (ISO) da competência mais recente entre os arquivos. */
export function latestCompetenceRange(files: ImportedFile[]): { startDate: string; endDate: string } | null {
  let best: { y: number; m: number } | null = null;
  for (const f of files) {
    const mm = /^(\d{2})-(\d{4})$/.exec((f.competencia || '').trim());
    if (!mm) continue;
    const c = { y: +mm[2], m: +mm[1] };
    if (!best || c.y > best.y || (c.y === best.y && c.m > best.m)) best = c;
  }
  if (!best) return null;
  const mm = String(best.m).padStart(2, '0');
  const last = new Date(best.y, best.m, 0).getDate();
  return { startDate: `${best.y}-${mm}-01`, endDate: `${best.y}-${mm}-${String(last).padStart(2, '0')}` };
}

export const useFileData = () => {
  const [files, setFiles] = useState<ImportedFile[]>(_cache || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (_cache && _cacheUserId === user.id) {
        setFiles(_cache);
      } else {
        loadFiles();
      }
    } else if (_cacheUserId) {
      // Logout: não deixa dados financeiros no navegador
      clearFileDataCache();
      setFiles([]);
    }
  }, [user]);

  // Sync with other hook instances when files change
  useEffect(() => {
    const handler = () => {
      if (_cache && _cacheUserId === user?.id) {
        setFiles([..._cache]);
      }
    };
    window.addEventListener('feex:files-updated', handler);
    return () => window.removeEventListener('feex:files-updated', handler);
  }, [user]);



  const loadFiles = async () => {
    if (!user) return;
    try {
      // 1. Load metadata only (no file_data) — avoids large response timeouts
      const { data: meta, error: metaErr } = await supabase
        .from('imported_files')
        .select('id, channel, type, year, competence, start_period, end_period, file_name, source_file_name, size, upload_date, file_headers, user_id')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (metaErr) throw metaErr;

      const formattedFiles: ImportedFile[] = meta.map(file => ({
        id: file.id,
        canal: file.channel,
        tipo: file.type,
        ano: file.year,
        competencia: file.competence,
        periodoInicial: file.start_period,
        periodoFinal: file.end_period,
        arquivo: file.file_name,
        originalName: file.source_file_name,
        size: file.size,
        dataUpload: new Date(file.upload_date),
        data: [],
        columns: file.file_headers || [],
      }));

      // Mantém dados já carregados nesta sessão
      if (_cacheUserId !== user.id) _loaded.clear();
      const prev = new Map((_cache || []).map(f => [f.id, f]));
      formattedFiles.forEach(f => {
        const old = prev.get(f.id);
        if (old && _loaded.has(f.id)) { f.data = old.data; f.columns = old.columns; }
      });
      const ids = new Set(formattedFiles.map(f => f.id));
      Array.from(_loaded).forEach(id => { if (!ids.has(id)) _loaded.delete(id); });

      // Lista aparece na hora; os dados de cada arquivo são carregados sob demanda (ensureFileData)
      _cache = formattedFiles;
      _cacheUserId = user.id;
      setFiles([...formattedFiles]);
      notifyListeners();
      window.dispatchEvent(new CustomEvent('feex:files-updated'));

      // Remove do cache local arquivos que não existem mais (deletados ou de outro usuário)
      idbKeys().then(keys => (keys || []).forEach(k => { if (!ids.has(String(k))) idbDel(String(k)); }));
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Erro ao carregar arquivos');
    }
  };

  const processFile = useCallback(async (file: File): Promise<ImportedFile> => {
    const fileInfo = parseFileName(file.name);
    // Normalize canal aliases
    if (fileInfo.canal === 'MAGALU') fileInfo.canal = 'MAGAZINE LUIZA';
    if (fileInfo.canal === 'MADEIRAMADEIRA') fileInfo.canal = 'MADEIRA MADEIRA';
    if (fileInfo.canal === 'SHEIN') fileInfo.canal = 'SHEIN';
    let data: DataRow[] = [];
    let columns: string[] = [];

    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
      const text = await file.text();
      if (fileInfo.canal === 'AMAZON') {
        // Find header line: must be exactly 'data/hora' or 'date/time' as first field
        // The first 9 lines are description text — one of them contains 'data/hora' in prose
        // so we match by exact field value, not substring
        const rawLines = text.split(/\r?\n/).filter(l => l.trim());
        let headerLineIndex = -1;
        for (let i = 0; i < rawLines.length; i++) {
          const firstField = rawLines[i].split(',')[0].replace(/"/g, '').trim().toLowerCase();
          if (firstField === 'data/hora' || firstField === 'date/time') {
            headerLineIndex = i;
            break;
          }
        }
        if (headerLineIndex === -1) throw new Error("Não foi possível encontrar o cabeçalho do CSV da Amazon");
        const dataLines = rawLines.slice(headerLineIndex);
        const parsedLines = parseCSV(dataLines.join('\n'));
        if (parsedLines.length > 0) {
          columns = parsedLines[0];
          const rawData = parsedLines.slice(1).map(values => {
            const row: DataRow = {};
            columns.forEach((col, index) => {
              const value = values[index] ?? '';
              const numValue = Number(value);
              row[col] = !isNaN(numValue) && value !== '' ? numValue : value;
            });
            return row;
          });
          data = rawData.filter(row => Object.values(row).some(v => v !== '' && v !== 0 && v != null));
        }
      } else {
        let lines = text.split('\n').filter(line => line.trim());
        let startLine = fileInfo.canal === 'MERCADO LIVRE' ? 7 : 0;
        const dataLines = lines.slice(startLine);
        if (dataLines.length > 0) {
          const delimiter = detectCSVDelimiter(dataLines);
          if (delimiter === ',' && detectSingleColumnCSV(dataLines)) {
            const splitLines = splitSingleColumnCSV(dataLines);
            dataLines.splice(0, dataLines.length, ...splitLines);
          }
          columns = dataLines[0].split(delimiter).map(col => col.trim().replace(/^\"|\"$/g, ''));
          const rawData = dataLines.slice(1).map(line => {
            const values = line.split(delimiter).map(val => val.trim().replace(/^\"|\"$/g, ''));
            const row: DataRow = {};
            columns.forEach((col, index) => {
              const value = values[index] || '';
              const numValue = Number(value);
              row[col] = !isNaN(numValue) && value !== '' ? numValue : value;
            });
            return row;
          });
          data = fileInfo.canal === 'MERCADO LIVRE'
            ? rawData.filter(row => {
                const firstValue = Object.values(row)[0];
                return firstValue !== columns[0] && !columns.includes(firstValue?.toString() || '');
              })
            : rawData;
        }
      }
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      if (fileInfo.canal === 'MERCADO LIVRE' || fileInfo.canal === 'AMAZON') range.s.r = 7;
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, range });
      if (jsonData.length > 0) {
        columns = Object.keys(jsonData[0] as object);
        data = (fileInfo.canal === 'MERCADO LIVRE' || fileInfo.canal === 'AMAZON')
          ? (jsonData as DataRow[]).filter(row => {
              const firstValue = Object.values(row)[0];
              return firstValue !== columns[0] && !columns.includes(firstValue?.toString() || '');
            })
          : jsonData as DataRow[];
      }
    }

    return {
      id: `${Date.now()}-${file.name}`,
      ...fileInfo,
      originalName: file.name,
      size: file.size,
      dataUpload: new Date(),
      data,
      columns,
    } as ImportedFile;
  }, []);

  const addFile = useCallback(async (file: File) => {
    if (!user) { setError('Usuário não autenticado'); return; }
    setLoading(true);
    setError(null);
    const tag = file.name;
    let createdId: string | null = null;
    let etapa = 'leitura do arquivo';
    try {
      logger.info('importacao', `Iniciando ${tag} (${Math.round(file.size / 1024)} KB)`);

      // 1. Nome no padrão CANAL_TIPO_ANO_COMPETENCIA_INICIO_FIM
      const partes = file.name.replace(/\.(txt|csv|xls|xlsx)$/i, '').split('_');
      if (partes.length < 6) {
        throw new Error(`Nome do arquivo fora do padrão. Use CANAL_TIPO_ANO_COMPETENCIA_INICIO_FIM (ex.: MERCADO LIVRE_FATURAMENTO_2026_08-2026_01-08-2026_31-08-2026.xlsx). Recebido: "${file.name}"`);
      }
      if (!/\.(txt|csv|xls|xlsx)$/i.test(file.name)) {
        throw new Error('Formato não suportado. Envie .xlsx, .xls, .csv ou .txt.');
      }

      // 2. Leitura e conversão
      let processedFile: ImportedFile;
      try {
        processedFile = await processFile(file);
      } catch (e: any) {
        throw new Error(`Não foi possível ler o arquivo: ${e?.message || e}. Confira se é o relatório original exportado do canal, sem edições.`);
      }
      if (!/^\d{2}-\d{4}$/.test(processedFile.competencia || '')) {
        logger.warn('importacao', `${tag}: competência "${processedFile.competencia}" fora do formato MM-AAAA — o filtro por período pode não encontrar este arquivo.`);
      }
      if (!processedFile.columns.length || !processedFile.data.length) {
        throw new Error('Nenhuma linha de dados encontrada. Confira se o arquivo não está vazio e se é o relatório original do canal (o cabeçalho precisa estar no lugar padrão).');
      }
      logger.info('importacao', `${tag}: ${processedFile.data.length} linhas, ${processedFile.columns.length} colunas lidas`);

      // 3. Cria o registro (sem dados) para obter o ID
      etapa = 'criação do registro';
      const { data: savedFile, error: saveError } = await supabase
        .from('imported_files')
        .insert({
          channel: processedFile.canal,
          type: processedFile.tipo,
          year: processedFile.ano,
          competence: processedFile.competencia,
          start_period: processedFile.periodoInicial,
          end_period: processedFile.periodoFinal,
          file_name: processedFile.arquivo,
          source_file_name: processedFile.originalName,
          size: processedFile.size,
          file_data: [],
          file_headers: processedFile.columns,
          user_id: user.id,
        })
        .select('id, channel, type, year, competence, start_period, end_period, file_name, source_file_name, size, upload_date, file_headers')
        .single();
      if (saveError) throw saveError;
      createdId = savedFile.id;

      // 4. Envia os dados em blocos (arrays JSON, não strings)
      etapa = 'envio dos dados';
      const CHUNK = 2500;
      const rows = processedFile.data;
      if (rows.length <= CHUNK) {
        const { error: updErr } = await supabase.from('imported_files').update({ file_data: rows }).eq('id', savedFile.id);
        if (updErr) throw updErr;
      } else {
        const total = Math.ceil(rows.length / CHUNK);
        for (let i = 0, n = 1; i < rows.length; i += CHUNK, n++) {
          etapa = `envio dos dados (bloco ${n} de ${total})`;
          const { error: chunkErr } = await supabase.rpc('append_file_data', {
            p_id: savedFile.id,
            p_data: rows.slice(i, i + CHUNK),
          });
          if (chunkErr) throw chunkErr;
        }
      }

      const newFile: ImportedFile = {
        id: savedFile.id,
        canal: savedFile.channel,
        tipo: savedFile.type,
        ano: savedFile.year,
        competencia: savedFile.competence,
        periodoInicial: savedFile.start_period,
        periodoFinal: savedFile.end_period,
        arquivo: savedFile.file_name,
        originalName: savedFile.source_file_name,
        size: savedFile.size,
        dataUpload: new Date(savedFile.upload_date),
        data: processedFile.data,       // use local data, not from DB response
        columns: processedFile.columns,   // use local columns, not from DB response
      };

      _loaded.add(newFile.id);
      idbSet(newFile.id, { data: newFile.data, columns: newFile.columns });

      // Update cache and notify all hook instances
      _cache = [newFile, ...(_cache || [])];
      setFiles(prev => [newFile, ...prev]);
      window.dispatchEvent(new CustomEvent('feex:files-updated'));
      logger.info('importacao', `${tag}: importado com sucesso (${newFile.data.length} linhas)`);
      return newFile;
    } catch (err: any) {
      const friendly = err instanceof Error && !err.hasOwnProperty('code') ? err.message : describeError(err);
      const errorMessage = createdId ? `Falha na ${etapa}: ${friendly}` : friendly;
      logger.error('importacao', `${tag}: ${errorMessage}`, err);

      // Desfaz o registro incompleto para não bloquear a reimportação ("arquivo já importado")
      if (createdId) {
        const { error: delErr } = await supabase.from('imported_files').delete().eq('id', createdId).eq('user_id', user.id);
        if (delErr) logger.error('importacao', `${tag}: não foi possível desfazer o registro incompleto ${createdId}. Delete-o manualmente antes de reimportar.`, delErr);
        else logger.info('importacao', `${tag}: registro incompleto removido — pode reimportar.`);
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [processFile, user]);

  const removeFile = useCallback(async (fileId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('imported_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);
      if (error) throw error;
      _loaded.delete(fileId);
      idbDel(fileId);
      // Update cache and notify all hook instances
      _cache = (_cache || []).filter(f => f.id !== fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      window.dispatchEvent(new CustomEvent('feex:files-updated'));
    } catch (err) {
      console.error('Error removing file:', err);
      setError('Erro ao remover arquivo');
    }
  }, [user]);

  const getFilesByChannel = useCallback((channel: string) => {
    return files.filter(file => file.canal === channel.toUpperCase());
  }, [files]);

  const getAllChannelData = useCallback((channel: string) => {
    return getFilesByChannel(channel).flatMap(f => f.data);
  }, [getFilesByChannel]);

  const subscribe = (fn: () => void) => {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  };

  return { files, loading, error, addFile, removeFile, getFilesByChannel, getAllChannelData, loadFiles, subscribe, ensureFileData };
};
