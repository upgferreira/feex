import React, { useState } from 'react';
import { ChevronDown, Settings, Zap, Moon, LogOut, Building2, User, Package, Tag, Shield } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onViewChange, 
  onCategoryClick, 
  onBoxClick,
  onIntegrationsClick,
  isAdmin = false
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 h-14">
        <div className="flex items-center justify-between h-full px-6">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FEEX</h1>
          </div>

          {/* Navigation - Only show for non-admin users */}
          {!isAdmin && (
            <nav className="flex items-center space-x-8">
              <button
                onClick={() => onViewChange('importacao')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentView === 'importacao'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                IMPORTAR
              </button>
              <button
                onClick={() => onViewChange('dados')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentView === 'dados'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                VISUALIZAR
              </button>
              <button
                onClick={() => onViewChange('exportacao')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentView === 'exportacao'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                EXPORTAR
              </button>
            </nav>
          )}

          {/* Admin Navigation */}
          {isAdmin && (
            <nav className="flex items-center space-x-8">
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

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    FEEX Analytics {isAdmin && <span className="text-xs text-blue-600 dark:text-blue-400">(Admin)</span>}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {!isAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        onBoxClick();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Package className="w-4 h-4" />
                      <span>Caixas</span>
                    </button>
                    <button 
                      onClick={() => {
                        onCategoryClick();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Tag className="w-4 h-4" />
                      <span>Categorias</span>
                    </button>
                    <button 
                      onClick={() => {
                        onIntegrationsClick();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Integrações</span>
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    setSettingsModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </button>
                <button 
                  onClick={toggleDarkMode}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Moon className="w-4 h-4" />
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  );
};