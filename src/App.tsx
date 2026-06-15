import React, { useState, useEffect, useMemo } from 'react';
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
import { MappingModal } from './components/MappingModal';
import { MethodsModal } from './components/MethodsModal';
import { useAuth } from './hooks/useAuth';
import { useAdmin } from './hooks/useAdmin';
import { useDarkMode } from './hooks/useDarkMode';
import { useFileData } from './hooks/useFileData';

type ViewMode = 'importacao' | 'dados' | 'exportacao' | 'admin';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dados');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [methodsModalOpen, setMethodsModalOpen] = useState(false);
  const [selectedCanal, setSelectedCanal] = useState<string>('TODOS');
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isDarkMode } = useDarkMode();
  const { files, subscribe } = useFileData();

  // Unique canal list from imported files
  const canais = useMemo(() => {
    return Array.from(new Set(files.map(f => f.canal))).sort();
  }, [files]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Force re-render when files change (fixes dropdown delay)
  const [, forceUpdate] = React.useState(0);
  useEffect(() => {
    return subscribe(() => forceUpdate(n => n + 1));
  }, [subscribe]);

  useEffect(() => {
    if (!adminLoading) {
      if (isAdmin) setCurrentView('admin');
      else setCurrentView('dados');
    }
  }, [isAdmin, adminLoading]);

  if (loading || adminLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  const renderContent = () => {
    switch (currentView) {
      case 'importacao': return <Importacao selectedCanal={selectedCanal} />;
      case 'dados':      return <Dados selectedCanal={selectedCanal} />;
      case 'exportacao': return <Exportacao />;
      case 'admin':      return <AdminPanel />;
      default:           return isAdmin ? <AdminPanel /> : <Dados selectedCanal={selectedCanal} />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          onCategoryClick={() => setCategoryModalOpen(true)}
          onBoxClick={() => setBoxModalOpen(true)}
          onIntegrationsClick={() => setIntegrationsModalOpen(true)}
          isAdmin={isAdmin}
          canais={canais}
          selectedCanal={selectedCanal}
          onCanalChange={setSelectedCanal}
        />
        <div className="flex-1 overflow-hidden pt-14 pb-8">
          {renderContent()}
        </div>
        <Footer
          onBoxClick={() => setBoxModalOpen(true)}
          onCategoryClick={() => setCategoryModalOpen(true)}
          onIntegrationsClick={() => setIntegrationsModalOpen(true)}
          onMappingClick={() => setMappingModalOpen(true)}
          onMethodsClick={() => setMethodsModalOpen(true)}
        />
        <CategoryModal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
        <BoxModal isOpen={boxModalOpen} onClose={() => setBoxModalOpen(false)} />
        <IntegrationsModal isOpen={integrationsModalOpen} onClose={() => setIntegrationsModalOpen(false)} />
        <MappingModal isOpen={mappingModalOpen} onClose={() => setMappingModalOpen(false)} />
        <MethodsModal isOpen={methodsModalOpen} onClose={() => setMethodsModalOpen(false)} />
    </div>
  );
}

export default App;
