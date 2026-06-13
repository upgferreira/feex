import React, { useState, useEffect } from 'react';
import { FullscreenModal } from './FullscreenModal';
import { supabase } from '../lib/supabase';
import { Save, Check } from 'lucide-react';

interface MappingModalProps { isOpen: boolean; onClose: () => void; }

const CHANNELS = [
  { label: 'Mercado Livre', table: 'channel_mercadolivre_headers' },
  { label: 'Nuvem Pago',    table: 'channel_nuvempago_headers' },
  { label: 'Amazon',        table: 'channel_amazon_headers' },
  { label: 'Magalu',        table: 'channel_magalu_headers' },
  { label: 'Shopee',        table: 'channel_shopee_headers' },
  { label: 'Shein',         table: 'channel_shein_headers' },
];

const ERPS = [
  { label: 'Bling', key: 'bling', table: 'erp_bling_headers' },
  { label: 'Olist', key: 'olist', table: 'erp_olist_headers' },
];

export const MappingModal: React.FC<MappingModalProps> = ({ isOpen, onClose }) => {
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [selectedErp, setSelectedErp] = useState(ERPS[0]);
  const [erpHeaders, setErpHeaders] = useState<string[]>([]);
  const [channelRows, setChannelRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // erpHeader → channelHeader
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, selectedChannel, selectedErp]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ERP headers
      const { data: erpData } = await supabase
        .from(selectedErp.table)
        .select('header')
        .order('created_at');
      setErpHeaders((erpData || []).map(r => r.header));

      // Load channel headers with existing mapping
      const { data: channelData } = await supabase
        .from(selectedChannel.table)
        .select('id, header, erp_mapping')
        .order('created_at');
      setChannelRows(channelData || []);

      // Build current mapping: erpHeader → channelHeader
      const currentMapping: Record<string, string> = {};
      (channelData || []).forEach(row => {
        const mapped = row.erp_mapping?.[selectedErp.key];
        if (mapped) currentMapping[mapped] = row.header;
      });
      setMapping(currentMapping);
    } catch (e) {
      console.error('Error loading mapping data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (erpHeader: string, channelHeader: string) => {
    setMapping(prev => ({ ...prev, [erpHeader]: channelHeader }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // For each channel row, update its erp_mapping
      const updates = channelRows.map(async row => {
        // Find if this channel header is mapped to any ERP header
        const erpHeader = Object.entries(mapping).find(([, ch]) => ch === row.header)?.[0] || null;
        const currentMapping = row.erp_mapping || {};
        const newMapping = { ...currentMapping, [selectedErp.key]: erpHeader };

        return supabase
          .from(selectedChannel.table)
          .update({ erp_mapping: newMapping, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      });

      await Promise.all(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Error saving mapping:', e);
    } finally {
      setSaving(false);
    }
  };

  // Channel headers that are not yet mapped to another ERP column
  const availableChannelHeaders = channelRows.map(r => r.header);

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="Mapeamento de Colunas">
      <div className="flex flex-col h-full">
        {/* Selectors */}
        <div className="px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-6 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Canal:</label>
            <div className="flex gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.table}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedChannel.table === ch.table
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ERP:</label>
            <div className="flex gap-2">
              {ERPS.map(erp => (
                <button
                  key={erp.key}
                  onClick={() => setSelectedErp(erp)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedErp.key === erp.key
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {erp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">
                    Coluna {selectedErp.label}
                  </th>
                  <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">
                    Coluna {selectedChannel.label} (De-Para)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {erpHeaders.map(erpHeader => (
                  <tr key={erpHeader} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-8 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {erpHeader}
                    </td>
                    <td className="px-8 py-3">
                      <select
                        value={mapping[erpHeader] || ''}
                        onChange={e => handleMappingChange(erpHeader, e.target.value)}
                        className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Não mapeado —</option>
                        {availableChannelHeaders.map(ch => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-8 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400">
          {channelRows.length} colunas no canal · {erpHeaders.length} colunas no ERP · ESC para fechar
        </div>
      </div>
    </FullscreenModal>
  );
};
