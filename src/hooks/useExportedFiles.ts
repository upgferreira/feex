import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface ExportedFile {
  id: string;
  canal: string;
  erp: string;
  ano: string;
  competencia: string;
  periodoInicial: string;
  periodoFinal: string;
  formatos: string[];
  arquivo: string;
  fileData: any[];
  dataDownload: Date;
}

export const useExportedFiles = () => {
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load exported files from Supabase on mount
  useEffect(() => {
    if (user) {
      loadExportedFiles();
    }
  }, [user]);

  const loadExportedFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exported_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFiles: ExportedFile[] = data.map(file => ({
        id: file.id,
        canal: file.canal,
        erp: file.erp,
        ano: file.ano,
        competencia: file.competencia,
        periodoInicial: file.periodo_inicial,
        periodoFinal: file.periodo_final,
        formatos: file.formatos,
        arquivo: file.arquivo,
        fileData: file.file_data,
        dataDownload: new Date(file.created_at),
      }));

      setExportedFiles(formattedFiles);
    } catch (err) {
      console.error('Error loading exported files:', err);
      setError('Erro ao carregar arquivos exportados');
    }
  };

  const saveExportedFile = useCallback(async (exportData: Omit<ExportedFile, 'id' | 'dataDownload'>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Save to Supabase
      const { data: savedFile, error: saveError } = await supabase
        .from('exported_files')
        .insert({
          canal: exportData.canal,
          erp: exportData.erp,
          ano: exportData.ano,
          competencia: exportData.competencia,
          periodo_inicial: exportData.periodoInicial,
          periodo_final: exportData.periodoFinal,
          formatos: exportData.formatos,
          arquivo: exportData.arquivo,
          file_data: exportData.fileData,
          user_id: user.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Update local state
      const newFile: ExportedFile = {
        id: savedFile.id,
        canal: savedFile.canal,
        erp: savedFile.erp,
        ano: savedFile.ano,
        competencia: savedFile.competencia,
        periodoInicial: savedFile.periodo_inicial,
        periodoFinal: savedFile.periodo_final,
        formatos: savedFile.formatos,
        arquivo: savedFile.arquivo,
        fileData: savedFile.file_data,
        dataDownload: new Date(savedFile.created_at),
      };

      setExportedFiles(prev => [newFile, ...prev]);
      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar arquivo exportado';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const removeExportedFile = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('exported_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (error) throw error;

      setExportedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Error removing exported file:', err);
      setError('Erro ao remover arquivo exportado');
    }
  }, [user]);

  return {
    exportedFiles,
    loading,
    error,
    saveExportedFile,
    removeExportedFile,
    loadExportedFiles,
  };
};