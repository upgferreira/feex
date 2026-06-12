import React, { useState } from 'react';
import { Bell, Link2, Settings, Sun, Moon, LogOut, Cog } from 'lucide-react';
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
  currentView,
  onViewChange,
  onCategoryClick,
  onBoxClick,
  onIntegrationsClick,
  isAdmin = false,
  canais = [],
  selectedCanal = 'TODOS',
  onCanalChange,
}) => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleSignOut = async () => { await signOut(); };

  const iconBtn = (
    title: string,
    icon: React.ReactNode,
    onClick: () => void,
    red = false
  ) => (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        red
          ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 h-14">
        <div className="relative flex items-center justify-between h-full px-6">

          {/* LEFT — Logo + canal filter */}
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FEEX</h1>

            {!isAdmin && canais.length > 0 && (
              <>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onCanalChange?.('TODOS')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCanal === 'TODOS'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    TODOS
                  </button>
                  {canais.map((canal) => (
                    <button
                      key={canal}
                      onClick={() => onCanalChange?.(canal)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCanal === canal
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {canal}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CENTER — Nav (absolute) */}
          {!isAdmin && (
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-8">
              {(['importacao', 'dados', 'exportacao'] as const).map((view) => {
                const labels: Record<string, string> = { importacao: 'IMPORTAR', dados: 'VISUALIZAR', exportacao: 'EXPORTAR' };
                return (
                  <button
                    key={view}
                    onClick={() => onViewChange(view)}
                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      currentView === view
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {labels[view]}
                  </button>
                );
              })}
            </nav>
          )}

          {isAdmin && (
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-8">
              <button
                onClick={() => onViewChange('admin')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentView === 'admin'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                PAINEL ADMIN
              </button>
            </nav>
          )}

          {/* RIGHT — Icon buttons */}
          <div className="flex items-center space-x-1">
            {iconBtn('Notificações', <Bell size={18} />, () => {})}
            {!isAdmin && iconBtn('Integrações', <Link2 size={18} />, onIntegrationsClick)}
            {iconBtn('Configurações', <Cog size={18} />, () => setSettingsModalOpen(true))}
            {iconBtn(
              isDarkMode ? 'Modo Claro' : 'Modo Escuro',
              isDarkMode ? <Sun size={18} /> : <Moon size={18} />,
              toggleDarkMode
            )}
            {iconBtn('Sair', <LogOut size={18} />, handleSignOut, true)}
          </div>
        </div>
      </header>

      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </>
  );
};
