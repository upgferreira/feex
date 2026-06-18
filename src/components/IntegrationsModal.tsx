import React, { useState, useEffect } from 'react';
import { FullscreenModal } from './FullscreenModal';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface IntegrationsModalProps { isOpen: boolean; onClose: () => void; }

const BLING_AUTH_URL =
  'https://www.bling.com.br/Api/v3/oauth/authorize' +
  '?response_type=code' +
  '&client_id=20ee7c7ce2430f22007c9247635758d75cda362d' +
  '&state=bfeabb9009e271fe5896da2827e81b91';

const ERP = [
  { name: 'BLING',      available: true,  hasOAuth: true  },
  { name: 'OLIST/TINY', available: true,  hasOAuth: false },
  { name: 'LYNX',       available: false, hasOAuth: false },
  { name: 'OMIE',       available: false, hasOAuth: false },
  { name: 'SANKHYA',    available: false, hasOAuth: false },
  { name: 'UPSELLER',   available: false, hasOAuth: false },
];

const MARKETPLACES = [
  { name: 'AMAZON',        available: true,  hasOAuth: false },
  { name: 'MAGALU',        available: true,  hasOAuth: false },
  { name: 'MERCADO LIVRE', available: true,  hasOAuth: false },
  { name: 'SHEIN',         available: true,  hasOAuth: false },
  { name: 'SHOPEE',        available: true,  hasOAuth: false },
  { name: 'TEMU',          available: false, hasOAuth: false },
  { name: 'TIKTOK SHOP',   available: false, hasOAuth: false },
];

const GATEWAYS = [
  { name: 'NUVEM PAGO',  available: true,  hasOAuth: false },
  { name: 'CIELO',       available: true,  hasOAuth: false },
  { name: 'MERCADO PAGO',available: false, hasOAuth: false },
  { name: 'PAGARME',     available: false, hasOAuth: false },
  { name: 'REDE',        available: false, hasOAuth: false },
  { name: 'STONE',       available: false, hasOAuth: false },
];

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const [blingConnected, setBlingConnected] = useState(false);
  const [blingExpiry, setBlingExpiry]       = useState<string | null>(null);
  const [checking, setChecking]             = useState(false);

  const checkBlingStatus = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('bling_tokens')
        .select('expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setBlingConnected(!!data);
      setBlingExpiry(data?.expires_at ?? null);
    } catch (e) { console.error(e); }
    finally { setChecking(false); }
  };



  const disconnectBling = async () => {
    if (!confirm('Desconectar o Bling?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('bling_tokens').delete().eq('user_id', session.user.id);
    setBlingConnected(false);
    setBlingExpiry(null);
  };

  useEffect(() => { if (isOpen) checkBlingStatus(); }, [isOpen]);

  const Card = ({ name, available, hasOAuth }: { name: string; available: boolean; hasOAuth: boolean }) => {
    const isExpired = blingExpiry ? new Date(blingExpiry) < new Date() : false;
    const connected = hasOAuth && blingConnected;
    return (
      <div className={`flex flex-col items-center justify-between p-4 rounded-xl border transition-all ${
        available
          ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 shadow-sm'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold mb-2 ${
          available
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
          {name.charAt(0)}
        </div>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight mb-2">
          {name}
        </span>

        {hasOAuth ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            {checking ? (
              <span className="text-xs text-gray-400">Verificando...</span>
            ) : connected ? (
              <>
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Conectado</span>
                </div>
                {blingExpiry && (
                  <span className="text-xs text-gray-400">
                    {isExpired ? '⚠️ Expirado' : `Expira: ${new Date(blingExpiry).toLocaleDateString('pt-BR')}`}
                  </span>
                )}
                <div className="flex gap-1 mt-1 w-full">
                  <button onClick={disconnectBling}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-700 hover:bg-red-100">
                    <XCircle className="w-3 h-3" />
                    Desconectar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-gray-400">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-xs">Não conectado</span>
                </div>
                <a href={BLING_AUTH_URL}
                  className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium">
                  <ExternalLink className="w-3 h-3" />
                  Conectar
                </a>
              </>
            )}
          </div>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            available
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {available ? 'Disponível' : 'Em breve'}
          </span>
        )}
      </div>
    );
  };

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

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Integrações">
      <div className="p-8 overflow-auto h-full">
        <Section title="ERP" items={ERP} />
        <Section title="Marketplaces" items={MARKETPLACES} />
        <Section title="Gateways de Pagamento" items={GATEWAYS} />
      </div>
    </FullscreenModal>
  );
};
