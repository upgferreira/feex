import { useState, useCallback, useEffect, useRef } from 'react';
import { ImportedFile, DataRow } from '../types';
import { parseFileName, parseCSV, detectCSVDelimiter, detectSingleColumnCSV, splitSingleColumnCSV } from '../utils/fileParser';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import * as XLSX from 'xlsx';

// ── Module-level cache (persists across re-renders, resets on page reload) ────
let _cache: ImportedFile[] | null = null;
let _cacheUserId: string | null = null;
let _listeners: (() => void)[] = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
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

      // Show list immediately
      _cache = formattedFiles;
      _cacheUserId = user.id;
      setFiles([...formattedFiles]);
      notifyListeners();

      // 2. Load file_data for each file individually (avoids 37MB+ responses)
      for (const f of formattedFiles) {
        try {
          const { data: fd, error: fdErr } = await supabase
            .from('imported_files')
            .select('id, file_data, file_headers')
            .eq('id', f.id)
            .single();
          if (fdErr || !fd) continue;
          f.data = fd.file_data || [];
          f.columns = fd.file_headers || f.columns;
        } catch { continue; }
      }

      // Update cache with full data
      _cache = [...formattedFiles];
      setFiles([...formattedFiles]);
      notifyListeners();
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Erro ao carregar arquivos');
    }
  };

  const processFile = useCallback(async (file: File): Promise<ImportedFile> => {
    const fileInfo = parseFileName(file.name);
    // Normalize canal aliases
    if (fileInfo.canal === 'MAGALU') fileInfo.canal = 'MAGAZINE LUIZA';
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
    try {
      const processedFile = await processFile(file);
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
          file_data: processedFile.data,
          file_headers: processedFile.columns,
          user_id: user.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;

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
        data: savedFile.file_data,
        columns: savedFile.file_headers,
      };

      // Update cache and notify all hook instances
      _cache = [newFile, ...(_cache || [])];
      setFiles(prev => [newFile, ...prev]);
      window.dispatchEvent(new CustomEvent('feex:files-updated'));
      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar arquivo';
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

  return { files, loading, error, addFile, removeFile, getFilesByChannel, getAllChannelData, loadFiles, subscribe };
};
