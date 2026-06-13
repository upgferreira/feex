import React, { useState, useEffect } from 'react';
import { Download, Trash2, ArrowUp, ArrowDown, Filter, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExportRecord } from '../types';
import { ExportModal } from './ExportModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useFileData } from '../hooks/useFileData';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';

export const Exportacao: React.FC = () => {
  const { files } = useFileData();
  const canais = React.useMemo(() => [...new Set(files.map((f: any) => f.canal))].sort(), [files]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeFilterCol, setActiveFilterCol] = useState<keyof ExportRecord | null>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof ExportRecord | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [categories, setCategories] = useState<any[]>([]);
  const { getAllChannelData } = useFileData();
  const { user } = useAuth();
  const { getCategories } = useAdmin();

  // Load export records from Supabase on mount
  useEffect(() => {
    if (user) {
      loadExportRecords();
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadExportRecords = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exported_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRecords: ExportRecord[] = data.map(record => ({
        id: record.id,
        canal: record.channel,
        erp: record.type,
        ano: record.year,
        competencia: record.competence,
        periodoInicial: record.start_period,
        periodoFinal: record.end_period,
        formatos: record.format ? [record.format] : [],
        arquivo: record.file_name,
        dataDownload: new Date(record.created_at)
      }));

      setExportRecords(formattedRecords);
    } catch (err) {
      console.error('Error loading export records:', err);
    }
  };

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    if (!text) return '';
    
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais exceto hífens e espaços
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
      .toUpperCase();
  };

  // Função para encontrar categoria mapeada usando dados do banco
  const findMappedCategory = (detalhe: string): string => {
    if (!detalhe) return 'Nao mapeado';
    
    // Primeiro tenta busca exata
    const exactMatch = categories.find(cat => 
      cat.canal === 'MERCADO LIVRE' && 
      cat.categoria_canal.toUpperCase() === detalhe.toUpperCase()
    );
    
    if (exactMatch) return exactMatch.categoria_erp;
    
    // Normaliza o texto de entrada
    const normalizedInput = normalizeText(detalhe);
    
    // Busca por correspondência normalizada
    const normalizedMatch = categories.find(cat => {
      if (cat.canal !== 'MERCADO LIVRE') return false;
      const normalizedKey = normalizeText(cat.categoria_canal);
      return normalizedKey === normalizedInput;
    });
    
    if (normalizedMatch) return normalizedMatch.categoria_erp;
    
    // Busca parcial para casos como "CAMPAÃ'AS" vs "CAMPANHAS"
    const partialMatch = categories.find(cat => {
      if (cat.canal !== 'MERCADO LIVRE') return false;
      const normalizedKey = normalizeText(cat.categoria_canal);
      
      if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
        // Verifica se a similaridade é alta o suficiente
        const similarity = Math.max(normalizedKey.length, normalizedInput.length) - 
                          Math.abs(normalizedKey.length - normalizedInput.length);
        return similarity / Math.max(normalizedKey.length, normalizedInput.length) > 0.8;
      }
      return false;
    });
    
    if (partialMatch) return partialMatch.categoria_erp;
    
    return 'Nao mapeado';
  };

  // Função para converter data serial do Excel para formato brasileiro
  const convertExcelDate = (serialDate: number): string => {
    if (!serialDate || isNaN(serialDate)) return '';
    
    // Excel serial date: dias desde 1 de janeiro de 1900
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (serialDate - 1) * 24 * 60 * 60 * 1000);
    
    // Ajuste para o bug do Excel (1900 não é ano bissexto)
    if (serialDate > 59) {
      jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return jsDate.toLocaleDateString('pt-BR');
  };

  // Função para limpar texto removendo tabulações e espaços duplos
  const cleanText = (text: string): string => {
    if (!text) return '';
    
    return text
      .replace(/\t/g, ' ')        // Substitui tabulações por espaços
      .replace(/\s+/g, ' ')       // Substitui múltiplos espaços por um único espaço
      .trim();                    // Remove espaços no início e fim
  };

  const formatDateToBR = (dateString: string): string => {
    // Se é um número (data serial do Excel)
    const serialDate = Number(dateString);
    if (!isNaN(serialDate) && serialDate > 1 && serialDate < 100000) {
      return convertExcelDate(serialDate);
    }
    
    // Se já está no formato brasileiro, retorna como está
    if (dateString.includes('/')) {
      return dateString;
    }
    
    // Se está no formato YYYY-MM-DD, converte para DD/MM/YYYY
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    
    return dateString;
  };

  const formatValueToBR = (value: number): string => {
    // Converter para string com vírgula como separador decimal
    return value.toFixed(2).replace('.', ',');
  };

  const convertMercadoLivreToBling = (data: any[], dataInicial: string, dataFinal: string, competencia: string) => {
    console.log('Iniciando conversão Mercado Livre para Bling');
    console.log('Dados recebidos:', data.length, 'registros');
    console.log('Período:', dataInicial, 'até', dataFinal);

    if (!data || data.length === 0) {
      console.log('Nenhum dado encontrado para conversão');
      return [];
    }

    const clienteFornecedor = "EBAZAR.COM.BR. LTDA";
    const portador = "Banco | MERCADO PAGO | C/C";
    const cnpj = "03.007.331/0001-41";

    const resultado: any[] = [];

    // Converter datas de filtro para objetos Date
    const dataInicialObj = new Date(dataInicial);
    const dataFinalObj = new Date(dataFinal);

    console.log('Filtros de data:', dataInicialObj, 'até', dataFinalObj);

    data.forEach((row, index) => {
      try {
        const dataTarifa = row['Data da tarifa'];
        const detalhe = row['Detalhe'];
        const valorTarifa = row['Valor da tarifa'];
        const numVenda = row['Número da venda'];
        const cliente = row['Cliente'];

        if (!dataTarifa || !detalhe || valorTarifa === undefined || valorTarifa === null) {
          console.log(`Linha ${index} ignorada - dados obrigatórios ausentes:`, { dataTarifa, detalhe, valorTarifa });
          return;
        }

        // Converter data da tarifa para Date
        let dataLinha: Date;
        let dataFormatada: string;
        
        if (typeof dataTarifa === 'number') {
          // Data serial do Excel
          dataFormatada = convertExcelDate(dataTarifa);
          const [day, month, year] = dataFormatada.split('/');
          dataLinha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (typeof dataTarifa === 'string') {
          if (dataTarifa.includes('/')) {
            // Formato DD/MM/YYYY
            dataFormatada = dataTarifa;
            const [day, month, year] = dataTarifa.split('/');
            dataLinha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (dataTarifa.includes('-')) {
            // Formato YYYY-MM-DD
            dataLinha = new Date(dataTarifa);
            dataFormatada = dataLinha.toLocaleDateString('pt-BR');
          } else {
            dataLinha = new Date(dataTarifa);
            dataFormatada = dataLinha.toLocaleDateString('pt-BR');
          }
        } else {
          dataLinha = new Date(dataTarifa);
          dataFormatada = dataLinha.toLocaleDateString('pt-BR');
        }

        // Verificar se a data é válida
        if (isNaN(dataLinha.getTime())) {
          console.log(`Linha ${index} ignorada - data inválida:`, dataTarifa);
          return;
        }

        // Filtro por período
        if (dataLinha < dataInicialObj || dataLinha > dataFinalObj) {
          console.log(`Linha ${index} ignorada - fora do período:`, dataLinha);
          return;
        }

        // Mapear categoria usando a função melhorada com dados do banco
        const categoria = findMappedCategory(detalhe);

        // Criar observações no formato especificado (sem acentos e sem separadores que quebrem CSV)
        const obsComponents = [
          'MERCADO LIVRE',
          cleanText([detalhe, numVenda, cliente].filter(Boolean).join(' > ').toUpperCase()),
          categoria.toUpperCase(),
          `${formatDateToBR(dataInicial)} - ${formatDateToBR(dataFinal)}`,
          competencia
        ].filter(Boolean);

        // Juntar com pipe e aplicar limpeza de texto
        const obs = cleanText(obsComponents.join(' | '));

        // Converter valor para número e inverter sinal (despesas ficam negativas)
        const valorNumerico = Number(valorTarifa) * -1;

        const registro = {
          "ID": "",
          "Data": dataFormatada,
          "Competencia": dataFormatada,
          "Cliente/Fornecedor": clienteFornecedor,
          "Observacoes": obs,
          "Valor": formatValueToBR(valorNumerico),
          "Categoria": categoria,
          "Portador": portador,
          "Saldo": "N",
          "CNPJ": cnpj
        };

        resultado.push(registro);
        console.log(`Linha ${index} convertida:`, registro);

      } catch (error) {
        console.error(`Erro ao processar linha ${index}:`, error, row);
      }
    });

    console.log('Conversão finalizada:', resultado.length, 'registros convertidos');
    return resultado;
  };

  const generateEmptyBlingTemplate = () => {
    return [{
      "ID": "",
      "Data": "",
      "Competencia": "",
      "Cliente/Fornecedor": "",
      "Observacoes": "",
      "Valor": "",
      "Categoria": "",
      "Portador": "",
      "Saldo": "",
      "CNPJ": ""
    }];
  };

  const formatDateForFileName = (dateString: string): string => {
    // Check if dateString is null, undefined, or not a string
    if (!dateString || typeof dateString !== 'string') {
      return '01-01-1970'; // Return a default date format
    }
    
    // Convert YYYY-MM-DD to DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    
    // If it's not in the expected format, return as is or a default
    return dateString.replace(/[^\d-]/g, '') || '01-01-1970';
  };

  const generateFileName = (exportData: any, formato: string): string => {
    const { canal, erp, ano, dataInicial, dataFinal } = exportData;
    
    if (erp === 'BLING' && canal === 'MERCADO LIVRE') {
      // Extrair mês da data inicial para competência
      const dataInicialObj = dataInicial ? new Date(dataInicial) : new Date();
      const competencia = (dataInicialObj.getMonth() + 1).toString().padStart(2, '0');
      
      // Formatar datas para o padrão correto (DD-MM-YYYY)
      const dataInicialFormatted = formatDateForFileName(dataInicial);
      const dataFinalFormatted = formatDateForFileName(dataFinal);
      
      return `MERCADO_LIVRE_FATURAMENTO_${ano || new Date().getFullYear()}_${competencia}-${ano || new Date().getFullYear()}_${dataInicialFormatted}_${dataFinalFormatted}_bling-modelo-registro-caixa.${formato.toLowerCase()}`;
    }
    
    return `dados_exportacao_${canal}_${new Date().toISOString().split('T')[0]}.${formato.toLowerCase()}`;
  };

  const saveExportRecord = async (exportData: {
    canal: string;
    erp: string;
    dataInicial: string;
    dataFinal: string;
    formatos: string[];
  }) => {
    if (!user) return;

    try {
      // Extrair ano e competência da data inicial
      const dataInicialObj = new Date(exportData.dataInicial);
      const ano = dataInicialObj.getFullYear().toString();
      const competencia = (dataInicialObj.getMonth() + 1).toString().padStart(2, '0') + '/' + ano;

      // Gerar nome do arquivo baseado nos dados
      const fileName = generateFileName({ ...exportData, ano }, exportData.formatos[0]);

      // Salvar no banco de dados
      const { data, error } = await supabase
        .from('exported_files')
        .insert({
          channel: exportData.canal,
          type: exportData.erp,
          ano: ano,
          competence: competence,
          start_period: exportData.dataInicial,
          end_period: exportData.dataFinal,
          format: exportData.formatos?.[0] || exportData.formatos,
          arquivo: fileName.replace(/\.[^/.]+$/, ""), // Remove extensão para o nome base
          file_data: [], // Dados do arquivo se necessário
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      const newRecord: ExportRecord = {
        id: data.id,
        canal: data.canal,
        erp: data.erp,
        ano: data.year,
        competencia: data.competence,
        periodoInicial: data.start_period,
        periodoFinal: data.end_period,
        formatos: data.format ? [data.format] : [],
        arquivo: data.file_name,
        dataDownload: new Date(data.created_at),
      };

      setExportRecords(prev => [newRecord, ...prev]);
      return newRecord;
    } catch (error) {
      console.error('Erro ao salvar registro de exportação:', error);
    }
  };

  const handleExport = async (exportData: {
    canal: string;
    erp: string;
    dataInicial: string;
    dataFinal: string;
    formatos: string[];
  }) => {
    console.log('Iniciando exportação:', exportData);

    // Salvar registro no banco de dados
    await saveExportRecord(exportData);

    // Extrair ano e competência da data inicial
    const dataInicialObj = new Date(exportData.dataInicial);
    const ano = dataInicialObj.getFullYear().toString();
    const competencia = (dataInicialObj.getMonth() + 1).toString().padStart(2, '0') + '/' + ano;

    // Get actual data from the selected channel
    let channelData = getAllChannelData(exportData.canal);
    console.log('Dados do canal obtidos:', channelData.length, 'registros');

    let finalData = channelData;

    // Se for Bling + Mercado Livre, converter os dados
    if (exportData.erp === 'BLING' && exportData.canal === 'MERCADO LIVRE') {
      try {
        finalData = convertMercadoLivreToBling(channelData, exportData.dataInicial, exportData.dataFinal, competencia);
        
        // Se não conseguiu converter ou não há dados, gerar template vazio
        if (!finalData || finalData.length === 0) {
          console.log('Nenhum dado convertido, gerando template vazio');
          finalData = generateEmptyBlingTemplate();
        }
      } catch (error) {
        console.error('Erro na conversão, gerando template vazio:', error);
        finalData = generateEmptyBlingTemplate();
      }
    }

    console.log('Dados finais para exportação:', finalData.length, 'registros');

    // Generate files for each format
    exportData.formatos.forEach(formato => {
      const fileName = generateFileName({ ...exportData, ano }, formato);
      
      try {
        switch (formato) {
          case 'CSV':
            exportToCSV(finalData, fileName);
            break;
          case 'XLSX':
            exportToExcel(finalData, 'xlsx', fileName);
            break;
          case 'XLS':
            exportToExcel(finalData, 'xls', fileName);
            break;
          case 'OFX':
            exportToOFX(finalData, fileName);
            break;
        }
        console.log(`Arquivo ${formato} gerado com sucesso:`, fileName);
      } catch (error) {
        console.error(`Erro ao gerar arquivo ${formato}:`, error);
      }
    });
  };

  const exportToCSV = (data: any[], fileName?: string) => {
    if (data.length === 0) {
      console.log('Nenhum dado para exportar CSV');
      return;
    }

    const headers = Object.keys(data[0]);
    
    // Função para escapar valores CSV corretamente
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      const stringValue = value.toString();
      
      // Se contém vírgula, quebra de linha ou aspas, precisa ser escapado
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        // Duplicar aspas internas e envolver em aspas
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        headers.map(header => escapeCSVValue(item[header])).join(',')
      )
    ].join('\n');

    // Adicionar BOM para UTF-8 para garantir que acentos sejam exibidos corretamente
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || `dados_exportacao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const exportToExcel = (data: any[], format: 'xlsx' | 'xls', fileName?: string) => {
    if (data.length === 0) {
      console.log('Nenhum dado para exportar Excel');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    const defaultFileName = `dados_exportacao_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(workbook, fileName || defaultFileName);
  };

  const exportToOFX = (data: any[], fileName?: string) => {
    if (data.length === 0) {
      console.log('Nenhum dado para exportar OFX');
      return;
    }

    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}
<DTEND>${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}
${data.map((item, index) => `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${new Date().toISOString().replace(/[-:]/g, '').split('T')[0]}
<TRNAMT>-${Number(Object.values(item)[0]) || 0}
<FITID>${index + 1}
<NAME>${Object.values(item)[1] || 'Transação'}
<MEMO>Dados exportados
</STMTTRN>`).join('')}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const blob = new Blob([ofxContent], { type: 'application/x-ofx' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || `dados_exportacao_${new Date().toISOString().split('T')[0]}.ofx`;
    link.click();
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const handleDownloadRecord = (record: ExportRecord) => {
    console.log('Download do registro:', record);

    // Get the data for this record
    let channelData = getAllChannelData(record.canal);

    let finalData = channelData;

    // Se for Bling + Mercado Livre, converter os dados
    if (record.erp === 'BLING' && record.canal === 'MERCADO LIVRE') {
      try {
        finalData = convertMercadoLivreToBling(channelData, record.periodoInicial, record.periodoFinal, record.competencia);
        
        // Se não conseguiu converter ou não há dados, gerar template vazio
        if (!finalData || finalData.length === 0) {
          finalData = generateEmptyBlingTemplate();
        }
      } catch (error) {
        console.error('Erro na conversão durante download:', error);
        finalData = generateEmptyBlingTemplate();
      }
    }

    // Generate files for each format
    record.formatos.forEach(formato => {
      const fileName = generateFileName(record, formato);
      
      switch (formato) {
        case 'CSV':
          exportToCSV(finalData, fileName);
          break;
        case 'XLSX':
          exportToExcel(finalData, 'xlsx', fileName);
          break;
        case 'XLS':
          exportToExcel(finalData, 'xls', fileName);
          break;
        case 'OFX':
          exportToOFX(finalData, fileName);
          break;
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!recordToDelete || !user) return false;

    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password
      });

      if (error) {
        return false; // Invalid password
      }

      // Password is correct, proceed with deletion from database
      const { error: deleteError } = await supabase
        .from('exported_files')
        .delete()
        .eq('id', recordToDelete)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Update local state
      setExportRecords(prev => prev.filter(record => record.id !== recordToDelete));
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      return true;
    } catch (err) {
      console.error('Error verifying password or deleting record:', err);
      return false;
    }
  };

  const handleSort = (column: keyof ExportRecord) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const getUniqueColumnValues = (column: keyof ExportRecord) => {
    const values = exportRecords.map(record => record[column]).filter(Boolean);
    const uniqueValues = [...new Set(values)];
    
    if (column === 'dataDownload') {
      return uniqueValues.sort((a, b) => {
        if (a instanceof Date && b instanceof Date) {
          return a.getTime() - b.getTime();
        }
        return 0;
      });
    }
    
    return uniqueValues.sort();
  };

  const filteredAndSortedRecords = React.useMemo(() => {
    let result = [...exportRecords];

    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue) {
        result = result.filter(record => {
          const value = record[column as keyof ExportRecord];
          if (column === 'dataDownload' && value instanceof Date) {
            return value.toISOString().includes(filterValue);
          }
          if (Array.isArray(value)) {
            return value.some(v => v.toLowerCase().includes(filterValue.toLowerCase()));
          }
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = aVal.toString().localeCompare(bVal.toString());
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [exportRecords, columnFilters, sortColumn, sortDirection]);

  const SortableHeader: React.FC<{ column: keyof ExportRecord; children: React.ReactNode }> = ({ column, children }) => {
    const hasFilter = !!columnFilters[column];
    return (
      <th
        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap transition-colors ${
          hasFilter
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveFilterCol(prev => prev === column ? null : column);
          } else {
            handleSort(column);
          }
        }}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortColumn === column && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
          {hasFilter && <Filter className="w-3 h-3" />}
        </div>
      </th>
    );
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Fixed Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Exportação de Dados</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">{filteredAndSortedRecords.length} registro(s)</span>
            </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">{filteredAndSortedRecords.length} registro(s)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExportModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                Download Arquivo
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          <div className="flex-1 overflow-auto relative">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <SortableHeader column="channel">Canal</SortableHeader>
                    <SortableHeader column="erp">Tipo</SortableHeader>
                    <SortableHeader column="ano">Ano</SortableHeader>
                    <SortableHeader column="competence">Competência</SortableHeader>
                    <SortableHeader column="periodoInicial">Período Inicial</SortableHeader>
                    <SortableHeader column="periodoFinal">Período Final</SortableHeader>
                    <SortableHeader column="arquivo">Arquivo</SortableHeader>
                    <SortableHeader column="formatos">Formato(s)</SortableHeader>
                    <SortableHeader column="dataDownload">Data Download</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Download className="w-12 h-12 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhuma exportação realizada</p>
                          <p className="text-gray-400 dark:text-gray-500">Clique em "Download Arquivo" para começar</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.canal === 'AMAZON' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            record.canal === 'MERCADO LIVRE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            record.canal === 'MAGAZINE LUIZA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            record.canal === 'SHEIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            record.canal === 'SHOPEE' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            record.canal === 'TEMPLATE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {record.canal}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.erp === 'BLING' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            record.erp === 'TINY' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {record.erp}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.ano}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.competencia}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {record.periodoInicial ? formatDateToBR(record.periodoInicial) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {record.periodoFinal ? formatDateToBR(record.periodoFinal) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={record.arquivo}>{record.arquivo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <div className="flex gap-1">
                            {record.formatos.map(formato => (
                              <span key={formato} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                {formato}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(record.dataDownload)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadRecord(record)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
                              title="Download arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(record.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
                              title="Remover registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            {/* Ctrl+click filter popup */}
            {activeFilterCol && (
              <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Filtrar: {activeFilterCol}</span>
                  <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                <select
                  autoFocus
                  value={columnFilters[activeFilterCol] || ''}
                  onChange={e => handleColumnFilter(activeFilterCol, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  {getUniqueColumnValues(activeFilterCol).slice(0, 50).map(v => {
                    const str = v instanceof Date ? v.toISOString() : String(v ?? '');
                    const display = v instanceof Date ? formatDate(v) : String(v ?? '');
                    return <option key={str} value={str}>{display}</option>;
                  })}
                </select>
                {columnFilters[activeFilterCol] && (
                  <button onClick={() => handleColumnFilter(activeFilterCol!, '')} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar filtro</button>
                )}
              </div>
            )}
            {activeFilterCol && (
              <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Filtrar: {activeFilterCol}</span>
                  <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                <select autoFocus value={columnFilters[activeFilterCol] || ''} onChange={e => handleColumnFilter(activeFilterCol, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  {getUniqueColumnValues(activeFilterCol).slice(0, 50).map(v => {
                    const str = v instanceof Date ? v.toISOString() : String(v ?? '');
                    const display = v instanceof Date ? formatDate(v) : String(v ?? '');
                    return <option key={str} value={str}>{display}</option>;
                  })}
                </select>
                {columnFilters[activeFilterCol] && (
                  <button onClick={() => handleColumnFilter(activeFilterCol!, '')} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar filtro</button>
                )}
              </div>
            )}
            {activeFilterCol && (
              <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Filtrar: {activeFilterCol}</span>
                  <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                <select autoFocus value={columnFilters[activeFilterCol] || ''} onChange={e => handleColumnFilter(activeFilterCol, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  {getUniqueColumnValues(activeFilterCol).slice(0, 50).map(v => {
                    const str = v instanceof Date ? v.toISOString() : String(v ?? '');
                    const display = v instanceof Date ? formatDate(v) : String(v ?? '');
                    return <option key={str} value={str}>{display}</option>;
                  })}
                </select>
                {columnFilters[activeFilterCol] && (
                  <button onClick={() => handleColumnFilter(activeFilterCol!, '')} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar filtro</button>
                )}
              </div>
            )}
                      {activeFilterCol && (
              <div ref={filterRef} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Filtrar: {activeFilterCol}</span>
                  <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                <select autoFocus value={columnFilters[activeFilterCol] || ''} onChange={e => handleColumnFilter(activeFilterCol, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">Todos</option>
                  {getUniqueColumnValues(activeFilterCol).slice(0, 50).map(v => {
                    const str = v instanceof Date ? v.toISOString() : String(v ?? '');
                    const display = v instanceof Date ? formatDate(v) : String(v ?? '');
                    return <option key={str} value={str}>{display}</option>;
                  })}
                </select>
                {columnFilters[activeFilterCol] && (
                  <button onClick={() => handleColumnFilter(activeFilterCol!, '')} className="mt-2 w-full text-xs text-red-500 hover:text-red-700 text-center">Limpar filtro</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={exportModalOpen}
        canais={canais}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};
