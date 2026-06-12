import { useState, useCallback, useEffect, useRef } from 'react';
import { ImportedFile, DataRow } from '../types';
import { parseFileName, parseCSV, detectCSVDelimiter, detectSingleColumnCSV, splitSingleColumnCSV } from '../utils/fileParser';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import * as XLSX from 'xlsx';

// ── Module-level cache (persists across re-renders, resets on page reload) ────
let _cache: ImportedFile[] | null = null;
let _cacheUserId: string | null = null;

export const useFileData = () => {
  const [files, setFiles] = useState<ImportedFile[]>(_cache || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Use cache if it belongs to same user
      if (_cache && _cacheUserId === user.id) {
        setFiles(_cache);
      } else {
        loadFiles();
      }
    }
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('imported_files')
        .select('id, canal, tipo, ano, competencia, periodo_inicial, periodo_final, arquivo, original_name, size, data_upload, data, columns, user_id')
        .eq('user_id', user.id)
        .order('data_upload', { ascending: false });

      if (error) throw error;

      const formattedFiles: ImportedFile[] = data.map(file => ({
        id: file.id,
        canal: file.canal,
        tipo: file.tipo,
        ano: file.ano,
        competencia: file.competencia,
        periodoInicial: file.periodo_inicial,
        periodoFinal: file.periodo_final,
        arquivo: file.arquivo,
        originalName: file.original_name,
        size: file.size,
        dataUpload: new Date(file.data_upload),
        data: file.data,
        columns: file.columns,
      }));

      // Save to cache
      _cache = formattedFiles;
      _cacheUserId = user.id;
      setFiles(formattedFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Erro ao carregar arquivos');
    }
  };

  const processFile = useCallback(async (file: File): Promise<ImportedFile> => {
    const fileInfo = parseFileName(file.name);
    let data: DataRow[] = [];
    let columns: string[] = [];

    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
      const text = await file.text();
      if (fileInfo.canal === 'AMAZON') {
        const allLines = parseCSV(text);
        let headerRowIndex = -1;
        for (let i = 0; i < allLines.length; i++) {
          const firstCell = String(allLines[i][0]).toLowerCase();
          if (firstCell.includes('data/hora') || firstCell.includes('date/time')) {
            headerRowIndex = i;
            break;
          }
        }
        if (headerRowIndex === -1) throw new Error("Não foi possível encontrar o cabeçalho do CSV da Amazon");
        const importedData = allLines.slice(headerRowIndex);
        if (importedData.length > 0) {
          columns = importedData[0];
          const rawData = importedData.slice(1).map(values => {
            const row: DataRow = {};
            columns.forEach((col, index) => {
              const value = values[index] || '';
              const numValue = Number(value);
              row[col] = !isNaN(numValue) && value !== '' ? numValue : value;
            });
            return row;
          });
          data = rawData.filter(row => {
            const firstValue = Object.values(row)[0];
            return firstValue !== columns[0] && !columns.includes(firstValue?.toString() || '');
          });
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
          canal: processedFile.canal,
          tipo: processedFile.tipo,
          ano: processedFile.ano,
          competencia: processedFile.competencia,
          periodo_inicial: processedFile.periodoInicial,
          periodo_final: processedFile.periodoFinal,
          arquivo: processedFile.arquivo,
          original_name: processedFile.originalName,
          size: processedFile.size,
          data: processedFile.data,
          columns: processedFile.columns,
          user_id: user.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      const newFile: ImportedFile = {
        id: savedFile.id,
        canal: savedFile.canal,
        tipo: savedFile.tipo,
        ano: savedFile.ano,
        competencia: savedFile.competencia,
        periodoInicial: savedFile.periodo_inicial,
        periodoFinal: savedFile.periodo_final,
        arquivo: savedFile.arquivo,
        originalName: savedFile.original_name,
        size: savedFile.size,
        dataUpload: new Date(savedFile.data_upload),
        data: savedFile.data,
        columns: savedFile.columns,
      };

      // Update cache
      _cache = [newFile, ...(_cache || [])];
      setFiles(prev => [newFile, ...prev]);
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
      // Update cache
      _cache = (_cache || []).filter(f => f.id !== fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
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

  return { files, loading, error, addFile, removeFile, getFilesByChannel, getAllChannelData, loadFiles };
};
