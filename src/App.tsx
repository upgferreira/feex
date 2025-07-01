import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Auth } from './components/Auth';
import { Importacao } from './components/Importacao';
import { Dados } from './components/Dados';
import { Exportacao } from './components/Exportacao';
import { AdminPanel } from './components/AdminPanel';
import { CategoryModal } from './components/CategoryModal';
import { BoxModal } from './components/BoxModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { useAuth } from './hooks/useAuth';
import { useAdmin } from './hooks/useAdmin';
import { useDarkMode } from './hooks/useDarkMode';

type ViewMode = 'importacao' | 'dados' | 'exportacao' | 'admin';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dados');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isDarkMode } = useDarkMode();

  // Apply dark mode class to document root immediately
  useEffect(() => {
    const applyDarkMode = () => {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply immediately
    applyDarkMode();

    // Also apply on next tick to ensure it's applied after any other changes
    const timeoutId = setTimeout(applyDarkMode, 0);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode]);

  // Set default view based on admin status
  useEffect(() => {
    if (!adminLoading && isAdmin) {
      setCurrentView('admin');
    } else if (!adminLoading && !isAdmin) {
      setCurrentView('dados');
    }
  }, [isAdmin, adminLoading]);

  if (loading || adminLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <Auth />
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'importacao':
        return <Importacao />;
      case 'dados':
        return <Dados />;
      case 'exportacao':
        return <Exportacao />;
      case 'admin':
        return <AdminPanel />;
      default:
        return isAdmin ? <AdminPanel /> : <Dados />;
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <Header 
          currentView={currentView} 
          onViewChange={setCurrentView}
          onCategoryClick={() => setCategoryModalOpen(true)}
          onBoxClick={() => setBoxModalOpen(true)}
          onIntegrationsClick={() => setIntegrationsModalOpen(true)}
          isAdmin={isAdmin}
        />
        {/* Content with top padding to account for fixed header */}
        <div className="flex-1 overflow-hidden pt-14">
          {renderContent()}
        </div>
        <Footer />
        <CategoryModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
        />
        <BoxModal
          isOpen={boxModalOpen}
          onClose={() => setBoxModalOpen(false)}
        />
        <IntegrationsModal
          isOpen={integrationsModalOpen}
          onClose={() => setIntegrationsModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;