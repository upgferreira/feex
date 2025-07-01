export interface DataRow {
  [key: string]: string | number | boolean | null;
}

export interface ImportedFile {
  id: string;
  canal: string;
  tipo: string;
  ano: string;
  competencia: string;
  periodoInicial: string;
  periodoFinal: string;
  arquivo: string;
  dataUpload: Date;
  originalName: string;
  size: number;
  data: DataRow[];
  columns: string[];
}

export interface Analytics {
  totalRows: number;
  totalColumns: number;
  numericColumns: string[];
  textColumns: string[];
  columnStats: {
    [key: string]: {
      min?: number;
      max?: number;
      avg?: number;
      sum?: number;
      count: number;
      nullCount: number;
    };
  };
}

export type ViewMode = 'importacao' | 'dados' | 'dashboard' | 'exportacao';

export type Canal = 'AMAZON' | 'MAGAZINE LUIZA' | 'MERCADO LIVRE' | 'SHEIN' | 'SHOPEE';

export interface ChartData {
  categoria: string;
  valor: number;
}

export interface ExportData {
  id: number;
  produto: string;
  categoria: string;
  preco: number;
  quantidade: number;
  total: number;
  data: string;
  canal: string;
}

export interface ExportRecord {
  id: string;
  canal: string;
  erp: string;
  ano: string;
  competencia: string;
  periodoInicial: string;
  periodoFinal: string;
  formatos: string[];
  arquivo: string;
  dataDownload: Date;
}