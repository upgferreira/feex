import React from 'react';
import { X, Upload, BarChart2, Download, Database, HelpCircle, CheckCircle } from 'lucide-react';

interface HelpModalProps { isOpen: boolean; onClose: () => void; }

const cols = [
  {
    id: 'app',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <HelpCircle className="w-6 h-6 text-white" />,
    title: 'APP',
    subtitle: 'Hub Financeiro Ecommerce',
    items: [
      { label: 'O que é a FEEX?', text: 'Sistema de conciliação financeira para marketplaces. Transforma os relatórios dos canais de venda no formato de lançamento de caixa do ERP.' },
      { label: 'Para quem?', text: 'Empresas que vendem em múltiplos canais (Shopee, Amazon, Mercado Livre, Shein, Magalu) e precisam lançar no ERP sem retrabalho manual.' },
      { label: 'ERPs suportados', text: 'Bling e Olist (Tiny). Exporta no formato de importação de Registros de Caixa.' },
      { label: 'Nome dos arquivos', text: 'Padrão obrigatório:\nCANAL_TIPO_ANO_COMP_INICIO_FIM\nEx: SHOPEE_FATURAMENTO_2026_01-2026_01-01-2026_31-01-2026' },
      { label: 'Pré-requisitos', text: 'Antes de exportar, cadastre no rodapé: CAIXAS (portador por canal), CATEGORIAS (de-para canal → ERP) e MÉTODOS (formas de pagamento).' },
      { label: 'Suporte', text: 'Dúvidas? Entre em contato com a ARCA TECHNOLOGY via email ou WhatsApp.' },
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
      { label: 'Como funciona', text: 'Faça upload do arquivo Excel ou CSV baixado diretamente do marketplace. O sistema detecta o canal pelo nome do arquivo e processa automaticamente.' },
      { label: 'Passo 1', text: 'Baixe o relatório de faturamento/liquidação no painel do canal (Shopee, Amazon, ML etc.).' },
      { label: 'Passo 2', text: 'Renomeie o arquivo seguindo o padrão: CANAL_TIPO_ANO_COMP_INICIO_FIM.' },
      { label: 'Passo 3', text: 'Clique em Upload Arquivo no canto superior direito da tela de Importação.' },
      { label: 'Passo 4', text: 'O arquivo aparece na lista com canal, período e formato detectados automaticamente.' },
      { label: 'Dica', text: 'Use o seletor de canal no topo para filtrar arquivos por marketplace. Múltiplos arquivos podem coexistir.' },
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
      { label: 'CANAL vs ERP', text: 'CANAL mostra os dados originais do arquivo importado. ERP mostra o preview convertido para o formato Bling: Data, Competência, Categoria, Valor, Observações, Portador e CNPJ.' },
      { label: 'TABELA', text: 'Dados linha a linha. Clique no cabeçalho para ordenar. Ctrl+clique para abrir filtro multi-seleção estilo Excel.' },
      { label: 'MATRIZ', text: 'Agrupamento por Categoria Pai › Categoria com totais e percentual. Clique na linha para expandir e ver os detalhes.' },
      { label: 'DASHBOARD', text: '8 KPIs (vendas, receita, taxas, fretes, margens) + gráficos de pizza por categoria + gráfico de barras por dia.' },
      { label: 'Botão ⇄ Pivotar', text: 'Para Shopee, Shein e Amazon: transforma colunas de taxas em linhas individuais, facilitando a visualização e a conversão ERP.' },
      { label: 'Filtro de data', text: 'Botão 📅 no toolbar filtra os dados por período. Selecione início e fim ou use o mês completo.' },
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
      { label: 'Como funciona', text: 'Selecione o canal, o ERP destino e o período. O sistema converte os dados no formato de importação de Registros de Caixa do Bling.' },
      { label: 'Passo 1', text: 'Acesse EXPORTAR e escolha o Canal e o período com o seletor de datas.' },
      { label: 'Passo 2', text: 'Escolha o ERP destino (Bling ou Tiny) e clique em Gerar.' },
      { label: 'Passo 3', text: 'Baixe o CSV gerado e importe no ERP em Financeiro › Registros de Caixa › Importar.' },
      { label: 'Estrutura da Observação', text: 'CANAL: CLIENTE | PEDIDO > NF > DETALHE | PAI > CATEGORIA | DATA | COMPETÊNCIA' },
      { label: 'Atenção', text: 'Categorias não mapeadas aparecem em branco. Verifique em VISUALIZAR › ERP › MATRIZ antes de exportar.' },
    ],
  },
  {
    id: 'erp',
    color: 'bg-teal-600',
    lightBg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    icon: <Database className="w-6 h-6 text-white" />,
    title: 'ERP',
    subtitle: 'Cadastros e configurações',
    items: [
      { label: 'CAIXAS', text: 'Cadastre uma conta financeira para cada canal. Define o Portador (conta no ERP), Cliente/Fornecedor e CNPJ que aparecem em cada lançamento.' },
      { label: 'CATEGORIAS', text: 'De-para entre a categoria do canal e a categoria do ERP. Informe Canal, Categoria do Canal, Categoria Pai ERP e Categoria ERP. Sem isso a exportação fica incompleta.' },
      { label: 'MÉTODOS', text: 'Métodos de pagamento por canal. Define tipo, label e número de parcelas para cada forma de pagamento aceita.' },
      { label: 'MAPEAMENTO', text: 'Visualização do de-para entre colunas do arquivo do canal e campos do ERP. Badges indicam a origem: Coluna, Caixas, Categorias ou Fixo.' },
      { label: 'Modo APP vs ERP', text: 'No rodapé, cada modal tem dois modos: APP mostra os cadastros internos da FEEX. ERP conecta ao Bling via API e mostra os dados do ERP em tempo real.' },
      { label: 'Atalhos', text: 'Clique = selecionar linha. Ctrl+clique = filtrar coluna. Botões: Editar inline, Excluir com confirmação, Adicionar nova linha.' },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex">
      <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
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

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full" style={{ minWidth: 700 }}>
            {cols.map(col => (
              <div key={col.id} className={'rounded-xl border ' + col.border + ' flex flex-col overflow-hidden'}>
                <div className={col.color + ' px-3 py-3 flex items-center gap-2 flex-shrink-0'}>
                  {col.icon}
                  <div>
                    <p className="text-white font-bold text-sm">{col.title}</p>
                    <p className="text-white/70 text-xs leading-tight">{col.subtitle}</p>
                  </div>
                </div>
                <div className={col.lightBg + ' flex-1 p-3 space-y-3 overflow-auto'}>
                  {col.items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 pl-4 leading-relaxed whitespace-pre-line">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400 text-center">
          FEEX | ARCA TECHNOLOGY LTDA — feex.netlify.app
        </div>
      </div>
    </div>
  );
};
