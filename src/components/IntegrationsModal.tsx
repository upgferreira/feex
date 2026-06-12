import React from 'react';
import { FullscreenModal } from './FullscreenModal';
import { Building2, ShoppingCart } from 'lucide-react';

interface IntegrationsModalProps { isOpen: boolean; onClose: () => void; }

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const erp = [
    { name: 'BLING', emoji: '🔷', status: 'Disponível' },
    { name: 'OMIE', emoji: '🟢', status: 'Em breve' },
  ];
  const marketplaces = [
    { name: 'AMAZON', emoji: '🟠', status: 'Disponível' },
    { name: 'MAGAZINE LUIZA', emoji: '🔵', status: 'Disponível' },
    { name: 'MERCADO LIVRE', emoji: '🟡', status: 'Disponível' },
    { name: 'SHEIN', emoji: '🟣', status: 'Disponível' },
    { name: 'SHOPEE', emoji: '🔴', status: 'Disponível' },
  ];

  const Table = ({ title, icon, data }: { title: string; icon: React.ReactNode; data: typeof erp }) => (
    <div>
      <div className="flex items-center gap-2 px-8 py-4 border-b border-gray-100 dark:border-gray-800">
        {icon}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Integração</th>
            <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map(item => (
            <tr key={item.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-8 py-4 text-sm text-gray-900 dark:text-gray-100">
                <span className="mr-2">{item.emoji}</span>{item.name}
              </td>
              <td className="px-8 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'Disponível'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Integrações">
      <div className="overflow-auto h-full">
        <Table title="ERP" icon={<Building2 className="w-5 h-5 text-blue-600" />} data={erp} />
        <Table title="Marketplaces" icon={<ShoppingCart className="w-5 h-5 text-blue-600" />} data={marketplaces} />
      </div>
    </FullscreenModal>
  );
};
