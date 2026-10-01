import React, { useEffect, useState } from 'react';
import { getLoadProgress, LoadProgress } from '../hooks/useFileData';

/** Barra de progresso global enquanto os dados dos arquivos são carregados. */
export const LoadingProgress: React.FC = () => {
  const [progress, setProgress] = useState<LoadProgress>(getLoadProgress());

  useEffect(() => {
    const handler = () => setProgress(getLoadProgress());
    window.addEventListener('feex:load-progress', handler);
    return () => window.removeEventListener('feex:load-progress', handler);
  }, []);

  if (!progress) return null;
  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-blue-100 dark:bg-gray-700">
        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.max(pct, 5)}%` }} />
      </div>
      <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Carregando dados… {progress.done} de {progress.total} arquivo{progress.total > 1 ? 's' : ''} ({pct}%)
      </div>
    </>
  );
};
