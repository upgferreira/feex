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
  const btn = (label: string, onClick: () => void, mobile = false) => (
    <button onClick={onClick}
      className={'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-0.5 rounded ' + (mobile ? 'text-[9px]' : 'text-xs')}>
      {label}
    </button>
  );
  const sep = (mobile = false) => <span className={'text-gray-300 dark:text-gray-600 ' + (mobile ? 'text-[9px]' : 'text-xs')}>|</span>;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40">

      {/* ── DESKTOP: linha única original (md+) ── */}
      <div className="hidden md:flex items-center justify-between h-8 px-6">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          FEEX | ARCA TECHNOLOGY LTDA | ARCA HOLD LLC @2026
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          Clique na coluna para ordenar &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl</kbd>
          + clique para filtrar
        </div>
        <div className="flex items-center gap-1">
          {btn('? AJUDA', onHelpClick)}
          {sep()}
          {btn('MAPEAMENTO', onMappingClick)}
          {sep()}
          {btn('CATEGORIAS', onCategoryClick)}
          {sep()}
          {btn('CONTAS', onBoxClick)}
          {sep()}
          {btn('MÉTODOS', onMethodsClick)}
          {sep()}
          {btn('CAIXAS', onCaixasClick)}
        </div>
      </div>

      {/* ── MOBILE: duas linhas (< md) ── */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-0.5 h-7 px-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {btn('CATEGORIAS', onCategoryClick, true)}
          {sep(true)}
          {btn('CONTAS', onBoxClick, true)}
          {sep(true)}
          {btn('MÉTODOS', onMethodsClick, true)}
          {sep(true)}
          {btn('CAIXAS', onCaixasClick, true)}
          {sep(true)}
          {btn('MAPEAMENTO', onMappingClick, true)}
        </div>
        <div className="flex items-center justify-between h-7 px-4">
          <div className="text-[9px] text-gray-500 dark:text-gray-500 truncate">
            FEEX | ARCA TECHNOLOGY LTDA | ARCA HOLD LLC @2026
          </div>
          {btn('? AJUDA', onHelpClick, true)}
        </div>
      </div>

    </footer>
  );
};
