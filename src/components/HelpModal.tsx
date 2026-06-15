import React, { useState } from 'react';
import { X, Upload, BarChart2, Download, Map, Grid, HelpCircle, ChevronRight, ChevronDown, BookOpen, Layers, Database } from 'lucide-react';

interface HelpModalProps { isOpen: boolean; onClose: () => void; }

const sections = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'O que é a FEEX?',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>A <strong>FEEX</strong> é um sistema de conciliação financeira para marketplaces e gateways de pagamento. Ela transforma os relatórios brutos dos canais de venda no formato exigido pelo seu ERP, eliminando o trabalho manual.</p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono text-xs">
          <p className="text-gray-500 mb-1">Padrão de nome de arquivo:</p>
          <p className="text-blue-600 dark:text-blue-400">CANAL_TIPO_ANO_COMPETENCIA_PERIODO-INICIAL_PERIODO-FINAL</p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Ex: MERCADO LIVRE_FATURAMENTO_2026_01-2026_01-01-2026_31-01-2026</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-amber-800 dark:text-amber-300 text-xs">
          <strong>⚠️ Pré-requisitos:</strong> Caixa, Categorias e Fornecedor devem estar cadastrados no ERP antes de importar.
        </div>
      </div>
    ),
  },
  {
    icon: <Upload className="w-5 h-5" />,
    title: 'Módulo: IMPORTAR',
    color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Importe os relatórios dos canais de venda. Cada arquivo importado fica registrado com canal, tipo, período e data de upload.</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm">
          <li>Clique em <strong>Upload Arquivo</strong> no canto superior direito</li>
          <li>Selecione o canal (ex: Mercado Livre, Nuvem Pago)</li>
          <li>Escolha o tipo de relatório (Faturamento, etc.)</li>
          <li>Selecione o arquivo Excel/CSV do canal</li>
          <li>Clique em Importar</li>
        </ol>
        <p className="text-xs text-gray-500">Use o filtro por canal no topo para visualizar arquivos por canal. Clique nas colunas para ordenar · <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl</kbd>+clique para filtrar.</p>
      </div>
    ),
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: 'Módulo: VISUALIZAR',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Visualize e analise os dados importados em três modos de exibição:</p>
        <div className="space-y-2">
          {[
            { mode: 'TABELA', desc: 'Dados linha a linha. Suporta ordenação e filtros estilo Excel (Ctrl+clique).' },
            { mode: 'MATRIZ', desc: 'Agrupamento por Categoria Pai › Categoria com totais e percentuais. Clique para expandir.' },
            { mode: 'DASHBOARD', desc: '8 KPIs + gráficos de pizza por categoria + gráfico de barras por dia.' },
          ].map(({ mode, desc }) => (
            <div key={mode} className="flex gap-2">
              <span className="font-bold text-xs bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 h-fit mt-0.5">{mode}</span>
              <span className="text-xs">{desc}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
          <p className="font-semibold text-xs mb-1">Modo CANAL vs ERP</p>
          <p className="text-xs text-gray-600 dark:text-gray-400"><strong>CANAL</strong> — mostra os dados originais do arquivo importado.</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1"><strong>ERP</strong> — mostra um preview do arquivo convertido para o ERP (Bling), com as colunas: Data, Competência, Categoria, Observações, Valor, Cliente/Fornecedor, CNPJ, Portador.</p>
        </div>
        <p className="text-xs text-gray-500">Use o calendário 📅 para filtrar por período. O botão de funil filtra os dados visíveis.</p>
      </div>
    ),
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'Módulo: EXPORTAR',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Converte e exporta os dados no formato do ERP escolhido.</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm">
          <li>Clique em <strong>Download Arquivo</strong></li>
          <li>Selecione o Canal e o ERP</li>
          <li>Defina o período usando o seletor de datas</li>
          <li>Escolha o formato (CSV obrigatório para Bling)</li>
          <li>Clique em <strong>Gerar Exportação</strong></li>
        </ol>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-red-700 dark:text-red-400 text-xs">
          ⚠️ O sistema bloqueará a exportação se houver registros com categoria vazia ou não mapeada.
        </div>
        <p className="text-xs text-gray-500">Os arquivos exportados ficam registrados na tabela com data e formato. Use o ícone 📥 para baixar novamente.</p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs">
          <p className="font-semibold mb-1">Estrutura das Observações:</p>
          <p className="font-mono text-gray-600 dark:text-gray-400">CANAL: CLIENTE | PEDIDO &gt; NF &gt; DETALHE | CATEGORIA PAI &gt; CATEGORIA | DATA | COMPETÊNCIA</p>
        </div>
      </div>
    ),
  },
  {
    icon: <Map className="w-5 h-5" />,
    title: 'Rodapé: MAPEAMENTO',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Configure o de-para entre as colunas do canal e as colunas do ERP.</p>
        <ul className="space-y-1.5 text-sm list-disc list-inside">
          <li>Selecione o <strong>Canal</strong> (ex: Mercado Livre) e o <strong>ERP</strong> (ex: Bling)</li>
          <li>Para cada coluna do ERP, escolha qual coluna do canal corresponde</li>
          <li>Colunas com origem <span className="bg-purple-100 text-purple-700 px-1 rounded text-xs">Caixas</span> são preenchidas automaticamente das Caixas</li>
          <li>Colunas com origem <span className="bg-green-100 text-green-700 px-1 rounded text-xs">Categorias</span> são preenchidas automaticamente das Categorias</li>
          <li>Colunas com origem <span className="bg-gray-100 text-gray-700 px-1 rounded text-xs">Fixo</span> têm valor fixo (ex: Saldo = "N")</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: 'Rodapé: CAIXAS, CATEGORIAS, MEIOS',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <p className="font-semibold mb-1">CAIXAS</p>
          <p className="text-xs">Cadastro das contas financeiras por canal. Define o Portador, Cliente/Fornecedor e CNPJ que serão usados na conversão para o ERP.</p>
        </div>
        <div>
          <p className="font-semibold mb-1">CATEGORIAS</p>
          <p className="text-xs">Mapeamento das categorias do canal para as categorias do ERP. Coluna Canal → Categoria Pai ERP → Categoria ERP. Essencial para a conversão — registros sem categoria bloqueiam a exportação.</p>
        </div>
        <div>
          <p className="font-semibold mb-1">MEIOS</p>
          <p className="text-xs">Cadastro dos métodos de pagamento por canal (tipo, label, parcelas). Usado para identificar formas de pagamento nos relatórios.</p>
        </div>
        <p className="text-xs text-gray-500">Todos os cadastros têm: checkbox de seleção, botões Editar e Excluir, Adicionar novo registro e filtro Ctrl+clique nas colunas.</p>
      </div>
    ),
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Fluxo Completo',
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
    content: (
      <div className="space-y-2 text-sm">
        {[
          { step: '1', label: 'Cadastrar Caixas', desc: 'Rodapé › CAIXAS — um registro por canal com portador e fornecedor' },
          { step: '2', label: 'Mapear Categorias', desc: 'Rodapé › CATEGORIAS — de-para entre canal e ERP' },
          { step: '3', label: 'Importar Relatório', desc: 'IMPORTAR › Upload Arquivo — selecionar canal e arquivo' },
          { step: '4', label: 'Conferir no Preview', desc: 'VISUALIZAR › ERP › TABELA — ver como ficará no ERP' },
          { step: '5', label: 'Verificar Categorias', desc: 'VISUALIZAR › ERP › MATRIZ — verificar se há categorias vazias' },
          { step: '6', label: 'Exportar para ERP', desc: 'EXPORTAR › Download Arquivo › Gerar Exportação' },
          { step: '7', label: 'Importar no ERP', desc: 'Bling: Importação › Registros de caixa › Selecionar arquivo CSV' },
        ].map(({ step, label, desc }) => (
          <div key={step} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [expanded, setExpanded] = useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex">
      <div className="ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Como usar a FEEX</h2>
              <p className="text-xs text-gray-500">Hub Financeiro Ecommerce — Guia de uso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {sections.map((section, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className={`p-1.5 rounded-lg ${section.color}`}>{section.icon}</div>
                <span className="font-semibold text-gray-900 dark:text-white flex-1">{section.title}</span>
                {expanded === i
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 bg-white dark:bg-gray-900">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400 text-center">
          FEEX | ARCA SYSTEMS LTDA — feex.netlify.app
        </div>
      </div>
    </div>
  );
};
