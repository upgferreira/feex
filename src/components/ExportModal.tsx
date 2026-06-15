import React, { useState } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { X, Download, Building2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canais?: string[];
  onExport: (data: {
    canal: string;
    erp: string;
    dataInicial: string;
    dataFinal: string;
    formatos: string[];
  }) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  canais = [],
}) => {
  const [canal, setCanal] = useState('');
  const [erp, setErp] = useState('');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [formatos, setFormatos] = useState<string[]>([]);

  const channels = canais.length > 0 ? canais : ['AMAZON', 'MAGAZINE LUIZA', 'MERCADO LIVRE', 'SHEIN', 'SHOPEE'];
  const erps = ['BLING', 'TINY'];
  const formatOptions = ['CSV', 'XLSX', 'XLS', 'OFX'];

  // Quando BLING ou TINY é selecionado, automaticamente marca CSV e trava outros formatos
  const isERPSelected = erp === 'BLING' || erp === 'TINY';

  React.useEffect(() => {
    if (isERPSelected) {
      setFormatos(['CSV']);
    }
  }, [isERPSelected]);

  const handleSubmit = () => {
    
    console.log('Export validation:', { canal, erp, dataInicial, dataFinal, formatos });
    if (!canal || !erp || !dataInicial || !dataFinal || formatos.length === 0) {
      alert('Preencha todos os campos obrigatórios: Canal=' + canal + ' ERP=' + erp + ' Início=' + dataInicial + ' Fim=' + dataFinal + ' Formatos=' + formatos.length);
      return;
    }

    onExport({
      canal,
      erp,
      dataInicial,
      dataFinal,
      formatos,
    });

    // Reset form
    setCanal('');
    setErp('');
    setDataInicial('');
    setDataFinal('');
    setFormatos([]);
    
    // Auto-close modal after export
    onClose();
  };

  const handleFormatoChange = (formato: string) => {
    if (isERPSelected) return; // Não permite mudança quando Bling ou Tiny está selecionado
    
    setFormatos(prev => 
      prev.includes(formato)
        ? prev.filter(f => f !== formato)
        : [...prev, formato]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white dark:bg-gray-800 h-full w-full max-w-lg flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurar Exportação</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Canal *
            </label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Selecione um canal</option>
              {channels.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ERP *
            </label>
            <select
              value={erp}
              onChange={(e) => setErp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Selecione um ERP</option>
              {erps.map(erpOption => (
                <option key={erpOption} value={erpOption}>{erpOption}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período *</label>
            <DateRangePicker
              startDate={dataInicial}
              endDate={dataFinal}
              onChange={(s, e) => { setDataInicial(s); setDataFinal(e); }}
              onClose={() => {}}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Formatos de Exportação *
              {isERPSelected && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  (CSV obrigatório para {erp})
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map(formato => (
                <label key={formato} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formatos.includes(formato)}
                    onChange={() => handleFormatoChange(formato)}
                    disabled={isERPSelected && formato !== 'CSV'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`ml-2 text-sm ${
                    isERPSelected && formato !== 'CSV' 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {formato}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit as any}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Gerar Exportação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};