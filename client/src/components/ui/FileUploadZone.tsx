import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { Upload, File, X } from 'lucide-react';

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ACCEPTED_EXTENSIONS = '.csv,.xls,.xlsx';

export interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  progress?: number;
  fileName?: string;
  fileSize?: number;
  isUploading?: boolean;
  onCancel?: () => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  progress,
  fileName,
  fileSize,
  isUploading = false,
  onCancel,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const hasFile = !!fileName;

  return (
    <div
      className={clsx(
        'rounded-[20px] border border-[#E5E5E5] bg-white p-8 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]',
        className,
      )}
    >
      {!hasFile ? (
        <div
          className={clsx(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors',
            isDragOver
              ? 'border-[#6DED67] bg-[#E8FDE7] dark:bg-[rgba(109,237,103,0.05)]'
              : 'border-[#D4D4D4] hover:border-[#A3A3A3] dark:border-[#404040] dark:hover:border-[#737373]',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="Arraste um arquivo ou clique para selecionar"
        >
          <Upload size={48} className="mb-4 text-[#6DED67]" />
          <p className="mb-1 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
            Arraste um arquivo aqui
          </p>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3]">
            ou clique para selecionar. Aceita CSV, XLS, XLSX
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleChange}
            className="hidden"
            aria-hidden
          />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E8FDE7] dark:bg-[rgba(109,237,103,0.1)]">
            <File size={22} className="text-[#4BA846]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
              {fileName}
            </p>
            {fileSize !== undefined && (
              <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3]">
                {formatFileSize(fileSize)}
              </p>
            )}
            {progress !== undefined && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#262626]">
                <div
                  className="h-full rounded-full bg-[#6DED67] transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>
          {onCancel && isUploading && (
            <button
              onClick={onCancel}
              className="shrink-0 rounded-lg p-2 text-[#A3A3A3] transition-colors hover:bg-[#F2F2F2] hover:text-[#0D0D0D] dark:hover:bg-[#262626] dark:hover:text-white"
              aria-label="Cancelar upload"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
