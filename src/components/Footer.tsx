import React from 'react';

interface FooterProps {
  onBoxClick: () => void;
  onCategoryClick: () => void;
  onMappingClick: () => void;
  onMethodsClick: () => void;
  onHelpClick: () => void;
  onCaixasClick: () => void;
  companyName?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onBoxClick, onCategoryClick, onMappingClick, onMethodsClick, onHelpClick, onCaixasClick,
  companyName = 'ARCA',
}) => {
  const btn = (label: string, onClick: () => void) => (
    <button onClick={onClick}
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded whitespace-nowrap">
      {label}
    </button>
  );

  const sep = <span className="text-gray-300 dark:text-gray-600 text-xs flex-shrink-0">|</span>;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40">
      {/* Row 1: Módulos financeiros */}
      <div className="flex items-center justify-center gap-1 h-8 px-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {btn('CATEGORIAS', onCategoryClick)}
        {sep}
        {btn('CONTAS', onBoxClick)}
        {sep}
        {btn('MÉTODOS', onMethodsClick)}
        {sep}
        {btn('CAIXAS', onCaixasClick)}
        {sep}
        {btn('MAPEAMENTO', onMappingClick)}
      </div>

      {/* Row 2: Empresa + Ajuda */}
      <div className="flex items-center justify-between h-7 px-4">
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
          FEEX · {companyName}
        </span>
        {btn('? AJUDA', onHelpClick)}
      </div>
    </footer>
  );
};
