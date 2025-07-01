import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Calendar, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { useFileData } from '../hooks/useFileData';
import { DataRow } from '../types';

interface TableData {
  canal: string;
  totalRegistros: number;
  valorTotal: number;
  ultimaAtualizacao: string;
  status: 'ativo' | 'inativo';
}

export const Dados: React.FC = () => {
  const { files, getAllChannelData } = useFileData();
  const [selectedChannel, setSelectedChannel] = useState<string>('TODOS');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showTableA, setShowTableA] = useState(true);
  const [showTableB, setShowTableB] = useState(true);
  const [showTableC, setShowTableC] = useState(true);

  // Definir quais canais pertencem a cada tabela
  const tableAChannels = ['MERCADO LIVRE'];
  const tableBChannels = ['SHEIN'];
  const tableCChannels = ['SHOPEE', 'AMAZON', 'MAGAZINE LUIZA'];

  const channelColors = {
    'AMAZON': '#FF9500',
    'MERCADO LIVRE': '#FFE600',
    'MAGAZINE LUIZA': '#0066CC',
    'SHEIN': '#8B5CF6',
    'SHOPEE': '#EE4D2D',
  };

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalRecords = files.reduce((sum, file) => sum + file.data.length, 0);
    const activeChannels = new Set(files.map(file => file.canal)).size;
    const lastUpdate = files.length > 0 ? Math.max(...files.map(file => file.dataUpload.getTime())) : 0;

    return {
      totalFiles,
      totalRecords,
      activeChannels,
      lastUpdate: lastUpdate > 0 ? new Date(lastUpdate) : null,
    };
  }, [files]);

  // Preparar dados para gráficos
  const chartData = useMemo(() => {
    const channelStats: { [key: string]: { records: number; files: number } } = {};
    
    files.forEach(file => {
      if (!channelStats[file.canal]) {
        channelStats[file.canal] = { records: 0, files: 0 };
      }
      channelStats[file.canal].records += file.data.length;
      channelStats[file.canal].files += 1;
    });

    return Object.entries(channelStats).map(([canal, stats]) => ({
      canal,
      registros: stats.records,
      arquivos: stats.files,
      fill: channelColors[canal as keyof typeof channelColors] || '#8884d8',
    }));
  }, [files]);

  // Preparar dados das tabelas
  const getTableData = (channels: string[]): TableData[] => {
    return channels.map(canal => {
      const channelFiles = files.filter(file => file.canal === canal);
      const totalRecords = channelFiles.reduce((sum, file) => sum + file.data.length, 0);
      const lastUpdate = channelFiles.length > 0 
        ? Math.max(...channelFiles.map(file => file.dataUpload.getTime()))
        : 0;

      // Calcular valor total (se houver colunas de valor)
      let valorTotal = 0;
      channelFiles.forEach(file => {
        file.data.forEach(row => {
          Object.entries(row).forEach(([key, value]) => {
            if (typeof value === 'number' && 
                (key.toLowerCase().includes('valor') || 
                 key.toLowerCase().includes('price') || 
                 key.toLowerCase().includes('total'))) {
              valorTotal += Math.abs(value);
            }
          });
        });
      });

      return {
        canal,
        totalRegistros: totalRecords,
        valorTotal,
        ultimaAtualizacao: lastUpdate > 0 ? new Date(lastUpdate).toLocaleDateString('pt-BR') : 'N/A',
        status: totalRecords > 0 ? 'ativo' : 'inativo' as const,
      };
    });
  };

  const tableAData = getTableData(tableAChannels);
  const tableBData = getTableData(tableBChannels);
  const tableCData = getTableData(tableCChannels);

  // Dados filtrados para visualização detalhada
  const filteredData = useMemo(() => {
    if (selectedChannel === 'TODOS') {
      return files.flatMap(file => file.data);
    }
    return getAllChannelData(selectedChannel);
  }, [selectedChannel, files, getAllChannelData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getStatusColor = (status: 'ativo' | 'inativo') => {
    return status === 'ativo' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  const getChannelColor = (canal: string) => {
    const colors = {
      'AMAZON': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'MERCADO LIVRE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'MAGAZINE LUIZA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'SHEIN': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'SHOPEE': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[canal as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const TableComponent: React.FC<{ 
    title: string; 
    data: TableData[]; 
    isVisible: boolean; 
    onToggle: () => void;
  }> = ({ title, data, isVisible, onToggle }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {isVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      
      {isVisible && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Canal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Última Atualização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row) => (
                <tr key={row.canal} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChannelColor(row.canal)}`}>
                      {row.canal}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatNumber(row.totalRegistros)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(row.valorTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row.ultimaAtualizacao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                      {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visualização de Dados</h2>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="TODOS">Todos os Canais</option>
              {Object.keys(channelColors).map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Arquivos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(stats.totalFiles)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Registros</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(stats.totalRecords)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Canais Ativos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeChannels}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Atualização</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.lastUpdate ? stats.lastUpdate.toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registros por Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="canal" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg)', 
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="registros" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuição de Arquivos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="arquivos"
                  label={({ canal, percent }) => `${canal} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-6">
          <TableComponent
            title="Tabela A - Mercado Livre"
            data={tableAData}
            isVisible={showTableA}
            onToggle={() => setShowTableA(!showTableA)}
          />

          <TableComponent
            title="Tabela B - Shein"
            data={tableBData}
            isVisible={showTableB}
            onToggle={() => setShowTableB(!showTableB)}
          />

          <TableComponent
            title="Tabela C - Shopee, Amazon e Magazine Luiza"
            data={tableCData}
            isVisible={showTableC}
            onToggle={() => setShowTableC(!showTableC)}
          />
        </div>

        {/* Data Preview */}
        {filteredData.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prévia dos Dados - {selectedChannel}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mostrando {Math.min(10, filteredData.length)} de {formatNumber(filteredData.length)} registros
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {Object.keys(filteredData[0] || {}).slice(0, 6).map((key) => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {typeof value === 'number' ? formatNumber(value) : String(value || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};