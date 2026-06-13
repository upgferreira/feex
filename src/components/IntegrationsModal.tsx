import React from 'react';
import { FullscreenModal } from './FullscreenModal';

interface IntegrationsModalProps { isOpen: boolean; onClose: () => void; }

const ERP = [
  { name: 'BLING',        available: true  },
  { name: 'LYNX',         available: false },
  { name: 'OLIST/TINY',   available: true  },
  { name: 'OMIE',         available: false },
  { name: 'SANKHYA',      available: false },
  { name: 'UPSELLER',     available: false },
];

const MARKETPLACES = [
  { name: 'AMAZON',       available: true  },
  { name: 'MAGALU',       available: true  },
  { name: 'MERCADO LIVRE',available: true  },
  { name: 'SHEIN',        available: true  },
  { name: 'SHOPEE',       available: true  },
  { name: 'TEMU',         available: false },
  { name: 'TIKTOK SHOP',  available: false },
];

const GATEWAYS = [
  { name: 'CIELO',        available: true  },
  { name: 'MERCADO PAGO', available: false },
  { name: 'NUVEM PAGO',   available: true  },
  { name: 'PAGARME',      available: false },
  { name: 'REDE',         available: false },
  { name: 'STONE',        available: false },
];

const Card = ({ name, available }: { name: string; available: boolean }) => (
  <div className={`flex flex-col items-center justify-between p-4 rounded-xl border transition-all ${
    available
      ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 shadow-sm'
      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
  }`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold mb-3 ${
      available
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }`}>
      {name.charAt(0)}
    </div>
    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight mb-2">
      {name}
    </span>
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      available
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }`}>
      {available ? 'Disponível' : 'Em breve'}
    </span>
  </div>
);

const Section = ({ title, items }: { title: string; items: typeof ERP }) => (
  <div className="mb-8">
    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">
      {title}
    </h3>
    <div className="grid grid-cols-8 gap-3">
      {items.map(item => <Card key={item.name} {...item} />)}
    </div>
  </div>
);

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => (
  <FullscreenModal isOpen={isOpen} onClose={onClose} title="Integrações">
    <div className="p-8 overflow-auto h-full">
      <Section title="ERP" items={ERP} />
      <Section title="Marketplaces" items={MARKETPLACES} />
      <Section title="Gateways de Pagamento" items={GATEWAYS} />
    </div>
  </FullscreenModal>
);
