import React from 'react';

interface FooterProps {
  onBoxClick: () => void;
  onCategoryClick: () => void;
  onMappingClick: () => void;
  onMethodsClick: () => void;
  onHelpClick: () => void;
  onCaixasClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onBoxClick, onCategoryClick, onMappingClick, onMethodsClick, onHelpClick, onCaixasClick,
}) => {
  const btn = (label: string, onClick: () => void) => (
    <button onClick={onClick}
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-0.5 rounded whitespace-nowrap">
      {label}
    </button>
  );
  const sep = <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40">

      {/* ── DESKTOP: single row (md+) ── */}
      <div className="hidden md:flex items-center justify-between h-8 px-6">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          FEEX | ARCA SYSTEMS LTDA | ARCA HOLD LLC @2025
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          Clique para ordenar &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl</kbd>
          + clique para filtrar
        </div>
        <div className="flex items-center gap-1">
          {btn('? AJUDA', onHelpClick)}
          {sep}
          {btn('MAPEAMENTO', onMappingClick)}
          {sep}
          {btn('CATEGORIAS', onCategoryClick)}
          {sep}
          {btn('CONTAS', onBoxClick)}
          {sep}
          {btn('MÉTODOS', onMethodsClick)}
          {sep}
          {btn('CAIXAS', onCaixasClick)}
        </div>
      </div>

      {/* ── MOBILE: two rows (< md) ── */}
      <div className="md:hidden">
        {/* Row 1: Módulos financeiros */}
        <div className="flex items-center justify-center gap-0.5 h-8 px-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
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
          <span className="text-xs text-gray-400 dark:text-gray-500">FEEX · ARCA</span>
          {btn('? AJUDA', onHelpClick)}
        </div>
      </div>
    </footer>
  );
};
