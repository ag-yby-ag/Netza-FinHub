import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SortConfig } from '../../types/common';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortConfig?: SortConfig;
  onSort?: (config: SortConfig) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  sortConfig,
  onSort,
  page,
  totalPages,
  onPageChange,
  className,
  emptyMessage = 'Nenhum resultado encontrado.',
}: TableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortConfig | undefined>(sortConfig);
  const activeSort = sortConfig ?? internalSort;

  const handleSort = useCallback(
    (key: string) => {
      const newSort: SortConfig = {
        key,
        direction: activeSort?.key === key && activeSort.direction === 'asc' ? 'desc' : 'asc',
      };
      if (onSort) {
        onSort(newSort);
      } else {
        setInternalSort(newSort);
      }
    },
    [activeSort, onSort],
  );

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-[20px] border border-[#E5E5E5] bg-white dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F2F2F2] dark:border-[#262626]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-6 py-3.5 text-left font-["JetBrains_Mono"] text-[10px] font-medium uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]',
                    col.sortable && 'cursor-pointer select-none hover:text-[#0D0D0D] dark:hover:text-white',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && activeSort?.key === col.key && (
                      activeSort.direction === 'asc' ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-[#F7F7F7] transition-colors hover:bg-[#F7F7F7] dark:border-[#1A1A1A] dark:hover:bg-[rgba(255,255,255,0.02)]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-6 py-3.5 font-["Plus_Jakarta_Sans"] text-[13px] text-[#0D0D0D] dark:text-[#E5E5E5]',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages !== undefined && totalPages > 1 && page !== undefined && onPageChange && (
        <div className="flex items-center justify-between border-t border-[#F2F2F2] px-6 py-3 dark:border-[#262626]">
          <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3]">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#F2F2F2] disabled:opacity-40 dark:text-[#A3A3A3] dark:hover:bg-[#262626]"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#F2F2F2] disabled:opacity-40 dark:text-[#A3A3A3] dark:hover:bg-[#262626]"
              aria-label="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
