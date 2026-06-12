import React from 'react';

interface FooterProps {
  onBoxClick: () => void;
  onCategoryClick: () => void;
  onIntegrationsClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onBoxClick, onCategoryClick, onIntegrationsClick }) => {
  const linkBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-0.5 rounded"
    >
      {label}
    </button>
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 h-8">
      <div className="flex items-center justify-between h-full px-6">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          FEEX | ARCA SYSTEMS LTDA | ARCA HOLD LLC @2025
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          Clique na coluna para ordenar &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl</kbd>
          + clique para filtrar
        </div>
        <div className="flex items-center gap-1">
          {linkBtn('CAIXAS', onBoxClick)}
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
          {linkBtn('CATEGORIAS', onCategoryClick)}
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
          {linkBtn('MEIOS', onIntegrationsClick)}
        </div>
      </div>
    </footer>
  );
};
