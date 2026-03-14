export interface Upload {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'error' | 'partial';
  total_rows: number;
  processed_rows: number;
  error_rows: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadError {
  row: number;
  column: string;
  message: string;
}

export interface UploadPreview {
  id: number;
  headers: string[];
  rows: string[][];
  totalRows: number;
  previewRows: number;
}
