import { ImportedFile, DataRow } from '../types';

export const parseFileName = (fileName: string): Partial<ImportedFile> => {
  // Remove extensão
  const nameWithoutExt = fileName.replace(/\.(txt|csv|xls|xlsx)$/i, '');
  
  // Padrão: CANAL_TIPO_ANO_COMPETENCIA_PERIODO-INICIAL_PERIODO-FINAL
  const parts = nameWithoutExt.split('_');
  
  if (parts.length >= 6) {
    return {
      canal: parts[0].toUpperCase(),
      tipo: parts[1].toUpperCase(),
      ano: parts[2],
      competencia: parts[3],
      periodoInicial: parts[4],
      periodoFinal: parts[5],
      arquivo: fileName,
    };
  }
  
  // Fallback para nomes que não seguem o padrão
  return {
    canal: 'OUTROS',
    tipo: 'INDEFINIDO',
    ano: new Date().getFullYear().toString(),
    competencia: '01',
    periodoInicial: '',
    periodoFinal: '',
    arquivo: fileName,
  };
};

export const isValidChannel = (canal: string): boolean => {
  const validChannels = ['AMAZON', 'MAGAZINE LUIZA', 'MERCADO LIVRE', 'SHEIN', 'SHOPEE'];
  return validChannels.includes(canal.toUpperCase());
};

// Function to convert Excel serial date to JavaScript Date
export const excelDateToJSDate = (serial: number): Date => {
  // Excel's epoch is January 1, 1900, but it incorrectly treats 1900 as a leap year
  // JavaScript's epoch is January 1, 1970
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; 
  const date_info = new Date(utc_value * 1000);
  return date_info;
};

// Function to format date values properly
export const formatDateValue = (value: any): string => {
  if (!value) return '';
  
  // If it's already a formatted date string (dd/mm/yyyy), return as is
  if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    return value;
  }
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Check if it's likely an Excel serial date (between reasonable bounds)
    if (value > 1 && value < 100000) {
      const date = excelDateToJSDate(value);
      return date.toLocaleDateString('pt-BR');
    }
  }
  
  // If it's a date object or date string, format it
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('pt-BR');
  }
  
  return value.toString();
};

// Advanced CSV parser similar to your Google Apps Script
export const parseCSV = (csvContent: string): string[][] => {
  const lines = csvContent.split(/\r?\n/);
  const result: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"' && !inQuotes) {
        // Iniciando campo com aspas
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        // Verificar se é escape de aspas ("")
        if (j + 1 < line.length && line[j + 1] === '"') {
          currentField += '"';
          j++; // Pular a próxima aspa
        } else {
          // Fim do campo com aspas
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        // Separador de campo encontrado
        fields.push(currentField.trim());
        currentField = '';
      } else {
        // Caractere normal
        currentField += char;
      }
    }
    
    // Adicionar último campo da linha
    fields.push(currentField.trim());
    
    // Remover aspas duplas desnecessárias dos campos
    const cleanFields = fields.map(field => {
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1);
      }
      return field;
    });
    
    result.push(cleanFields);
  }
  
  return result;
};

// Function to parse CSV with proper delimiter handling
export const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
};

// Function to detect CSV delimiter
export const detectCSVDelimiter = (lines: string[]): string => {
  if (lines.length === 0) return ',';
  
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  const delimiters = [';', ',', '\t', '|'];
  const delimiterCounts: { [key: string]: number } = {};
  
  for (const delimiter of delimiters) {
    delimiterCounts[delimiter] = 0;
    
    for (const line of sampleLines) {
      // Count occurrences of delimiter outside quotes
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          delimiterCounts[delimiter]++;
        }
      }
    }
  }
  
  // Return the delimiter with the highest count
  let maxCount = 0;
  let bestDelimiter = ',';
  
  for (const [delimiter, count] of Object.entries(delimiterCounts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
};

// Function to detect if CSV has single column with comma-separated data
export const detectSingleColumnCSV = (lines: string[]): boolean => {
  if (lines.length < 2) return false;
  
  // Check if first few lines have only one column but contain commas
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  
  for (const line of sampleLines) {
    const fields = parseCSVLine(line, ',');
    // If we have only one field but it contains commas, it might be single-column CSV
    if (fields.length === 1 && line.includes(',')) {
      return true;
    }
  }
  
  return false;
};

// Function to split single column CSV data
export const splitSingleColumnCSV = (lines: string[]): string[] => {
  return lines.map(line => {
    // If line has quotes, respect them
    if (line.includes('"')) {
      return line;
    }
    
    // Otherwise, split by comma and rejoin with proper CSV formatting
    const parts = line.split(',').map(part => part.trim());
    
    // If any part contains spaces or special characters, wrap in quotes
    const formattedParts = parts.map(part => {
      if (part.includes(' ') || part.includes('"') || part.includes('\n')) {
        return `"${part.replace(/"/g, '""')}"`;
      }
      return part;
    });
    
    return formattedParts.join(',');
  });
};