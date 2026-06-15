import React from 'react';
import { X, Upload, BarChart2, Download, Database, HelpCircle, ArrowRight, CheckCircle } from 'lucide-react';

interface HelpModalProps { isOpen: boolean; onClose: () => void; }

const cols = [
  {
    id: 'feex',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <HelpCircle className="w-6 h-6 text-white" />,
    title: 'FEEX',
    subtitle: 'Hub Financeiro Ecommerce',
    items: [
      { label: 'O que é?', text: 'Sistema de conciliação financeira para marketplaces e gateways de pagamento.' },
      { label: 'Para quem?', text: 'Empresas que vendem em múltiplos canais e precisam conciliar no ERP.' },
      { label: 'Canais', text: 'Mercado Livre, Nuvem Pago, Amazon, Magalu, Shopee, Shein e mais.' },
      { label: 'ERPs', text: 'Bling e Olist (Tiny). Exporta no formato de importação de caixa.' },
      { label: 'Padrão de nome', text: 'CANAL_TIPO_ANO_COMPETENCIA_INICIO_FIM\nEx: MERCADO LIVRE_FATURAMENTO_2026_01-2026_01-01-2026_31-01-2026' },
      { label: 'Pré-requisitos', text: 'Caixas, Categorias e Fornecedores devem estar cadastrados no ERP antes da importação.' },
    ],
  },
  {
    id: 'importar',
    color: 'bg-green-600',
    lightBg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: <Upload className="w-6 h-6 text-white" />,
    title: 'IMPORTAR',
    subtitle: 'Carregar relatórios dos canais',
    items: [
      { label: 'Como usar', text: 'Clique em Upload Arquivo no canto superior direito.' },
      { label: 'Passo 1', text: 'Selecione o Canal (ex: Mercado Livre).' },
      { label: 'Passo 2', text: 'Escolha o tipo de relatório (Faturamento, etc.).' },
      { label: 'Passo 3', text: 'Selecione o arquivo Excel ou CSV baixado do canal.' },
      { label: 'Passo 4', text: 'Clique em Importar para carregar os dados.' },
      { label: 'Dica', text: 'Use o filtro por canal no topo para navegar entre os arquivos. Clique para ordenar · Ctrl+clique para filtrar.' },
    ],
  },
  {
    id: 'visualizar',
    color: 'bg-purple-600',
    lightBg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: <BarChart2 className="w-6 h-6 text-white" />,
    title: 'VISUALIZAR',
    subtitle: 'Analisar e conferir os dados',
    items: [
      { label: 'CANAL vs ERP', text: 'CANAL = dados originais do arquivo. ERP = preview convertido para Bling com Data, Categoria, Valor, Obs, Portador, CNPJ.' },
      { label: 'TABELA', text: 'Dados linha a linha com ordenação (clique) e filtro estilo Excel (Ctrl+clique).' },
      { label: 'MATRIZ', text: 'Agrupamento Categoria Pai › Categoria com totais e %. Clique para expandir.' },
      { label: 'DASHBOARD', text: '8 KPIs + gráficos de pizza por categoria + gráfico de barras por dia.' },
      { label: 'Calendário', text: 'Botão 📅 filtra os dados por período. Use presets ou selecione o mês.' },
      { label: 'Pedidos', text: 'Botão de agrupamento agrupa os registros por número de pedido.' },
    ],
  },
  {
    id: 'exportar',
    color: 'bg-orange-600',
    lightBg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: <Download className="w-6 h-6 text-white" />,
    title: 'EXPORTAR',
    subtitle: 'Gerar arquivo para o ERP',
    items: [
      { label: 'Como usar', text: 'Clique em Download Arquivo no canto superior direito.' },
      { label: 'Passo 1', text: 'Selecione o Canal e o ERP destino.' },
      { label: 'Passo 2', text: 'Defina o período com o seletor de datas.' },
      { label: 'Passo 3', text: 'Escolha o formato — CSV é obrigatório para Bling.' },
      { label: 'Bloqueio', text: 'O sistema bloqueia exportação se houver categorias vazias ou não mapeadas.' },
      { label: 'Estrutura Obs', text: 'CANAL: CLIENTE | PEDIDO > NF > DETALHE | PAI > CATEGORIA | DATA | COMPETÊNCIA' },
    ],
  },
  {
    id: 'cadastros',
    color: 'bg-teal-600',
    lightBg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    icon: <Database className="w-6 h-6 text-white" />,
    title: 'CADASTROS',
    subtitle: 'Mapeamento, Caixas, Categorias, Meios',
    items: [
      { label: 'MAPEAMENTO', text: 'De-para entre colunas do canal e colunas do ERP. Badges indicam origem: Coluna, Caixas, Categorias, Fixo.' },
      { label: 'CAIXAS', text: 'Conta financeira por canal. Define Portador, Cliente/Fornecedor e CNPJ usados na conversão.' },
      { label: 'CATEGORIAS', text: 'De-para canal → ERP. Coluna Canal + Categoria Pai ERP + Categoria ERP. Essencial para a exportação.' },
      { label: 'MEIOS', text: 'Métodos de pagamento por canal com tipo, label e parcelas.' },
      { label: 'Dica', text: 'Todos os cadastros têm checkbox de seleção, Editar inline, Excluir e Adicionar.' },
      { label: 'Atalhos', text: 'Clique = ordenar · Ctrl+clique = filtrar estilo Excel com multi-seleção.' },
    ],
  },
  {
    id: 'fluxo',
    color: 'bg-gray-700',
    lightBg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    icon: <ArrowRight className="w-6 h-6 text-white" />,
    title: 'FLUXO',
    subtitle: 'Processo completo passo a passo',
    items: [
      { label: '1. Cadastrar', text: 'Rodapé › CAIXAS — um registro por canal com portador e fornecedor.' },
      { label: '2. Mapear', text: 'Rodapé › CATEGORIAS — de-para entre canal e ERP. Sem isso a exportação é bloqueada.' },
      { label: '3. Importar', text: 'IMPORTAR › Upload — selecionar canal e arquivo do marketplace.' },
      { label: '4. Conferir', text: 'VISUALIZAR › ERP › TABELA — verificar preview da conversão.' },
      { label: '5. Verificar', text: 'VISUALIZAR › ERP › MATRIZ — checar categorias vazias antes de exportar.' },
      { label: '6. Exportar', text: 'EXPORTAR › Gerar — baixar CSV e importar no ERP em Registros de Caixa.' },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex">
      <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg"><HelpCircle className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Como usar a FEEX</h2>
              <p className="text-xs text-gray-500">Hub Financeiro Ecommerce — Guia completo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 columns */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-6 gap-4 h-full min-h-0" style={{ minWidth: 900 }}>
            {cols.map(col => (
              <div key={col.id} className={`rounded-xl border ${col.border} flex flex-col overflow-hidden`}>
                {/* Col header */}
                <div className={`${col.color} px-3 py-3 flex items-center gap-2 flex-shrink-0`}>
                  {col.icon}
                  <div>
                    <p className="text-white font-bold text-sm">{col.title}</p>
                    <p className="text-white/70 text-xs leading-tight">{col.subtitle}</p>
                  </div>
                </div>
                {/* Items */}
                <div className={`${col.lightBg} flex-1 p-3 space-y-3 overflow-auto`}>
                  {col.items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 pl-4.5 leading-relaxed whitespace-pre-line">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400 text-center">
          FEEX | ARCA SYSTEMS LTDA — feex.netlify.app
        </div>
      </div>
    </div>
  );
};
