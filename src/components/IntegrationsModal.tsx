import React from 'react';
import { X, Building2, ShoppingCart } from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const erpIntegrations = [
    { name: 'BLING', logo: '🔷' },
    { name: 'OMIE', logo: '🟢' }
  ];

  const marketplaceIntegrations = [
    { name: 'AMAZON', logo: '🟠' },
    { name: 'MAGAZINE LUIZA', logo: '🔵' },
    { name: 'MERCADO LIVRE', logo: '🟡' },
    { name: 'SHEIN', logo: '🟣' },
    { name: 'SHOPEE', logo: '🔴' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Integrações</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-8">
          {/* ERP Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">ERP</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {erpIntegrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                >
                  <div className="text-4xl mb-3">{integration.logo}</div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {integration.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">CANAIS</h3>
            </div>
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">MARKETPLACE</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {marketplaceIntegrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="text-4xl mb-3">{integration.logo}</div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                      {integration.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};