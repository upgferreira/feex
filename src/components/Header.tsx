import React, { useState, useRef, useEffect } from 'react';
import { Bell, Link2, Cog, Sun, Moon, LogOut, ChevronDown, X, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../hooks/useDarkMode';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  currentView: 'importacao' | 'dados' | 'exportacao' | 'admin';
  onViewChange: (view: 'importacao' | 'dados' | 'exportacao' | 'admin') => void;
  onCategoryClick: () => void;
  onBoxClick: () => void;
  onIntegrationsClick: () => void;
  isAdmin?: boolean;
  canais?: string[];
  selectedCanal?: string;
  onCanalChange?: (canal: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView, onViewChange, onCategoryClick, onBoxClick, onIntegrationsClick,
  isAdmin = false, canais = [], selectedCanal = 'TODOS', onCanalChange,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canalOpen, setCanalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canalRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (canalRef.current && !canalRef.current.contains(e.target as Node)) setCanalOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allCanais = ['TODOS', ...canais];

  const views: { key: 'importacao' | 'dados' | 'exportacao'; label: string }[] = [
    { key: 'importacao', label: 'IMPORTAR' },
    { key: 'dados',      label: 'VISUALIZAR' },
    { key: 'exportacao', label: 'EXPORTAR' },
  ];

  return (
    <>
      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50">

        {/* Row 1: Logo | Canal | Menu */}
        <div className="flex items-center justify-between h-12 px-4">
          {/* Logo */}
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">FEEX</h1>

          {/* Canal dropdown — center */}
          {!isAdmin && (
            <div className="relative flex-1 flex justify-center" ref={canalRef}>
              <button
                onClick={() => setCanalOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {selectedCanal}
                <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (canalOpen ? 'rotate-180' : '')} />
              </button>

              {canalOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
                  {allCanais.map(canal => (
                    <button key={canal} onClick={() => { onCanalChange?.(canal); setCanalOpen(false); }}
                      className={'w-full text-left px-4 py-2 text-sm transition-colors ' + (selectedCanal === canal
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                      {canal}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isAdmin && <div className="flex-1 flex justify-center"><span className="text-sm font-semibold text-blue-600 dark:text-blue-400">PAINEL ADMIN</span></div>}

          {/* Menu button */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50">
                <button onClick={() => { setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Bell className="w-4 h-4 text-gray-400" /> Notificações
                </button>
                {!isAdmin && (
                  <button onClick={() => { onIntegrationsClick(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Link2 className="w-4 h-4 text-gray-400" /> Integrações
                  </button>
                )}
                <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Cog className="w-4 h-4 text-gray-400" /> Configurações
                </button>
                <button onClick={() => { toggleDarkMode(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {isDarkMode ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
                  {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button onClick={async () => { setMenuOpen(false); await signOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Nav tabs */}
        {!isAdmin && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            {views.map(v => (
              <button key={v.key} onClick={() => onViewChange(v.key)}
                className={'flex-1 py-2 text-xs font-semibold transition-colors text-center ' + (currentView === v.key
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
                {v.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
