import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  exportFileName?: string;
  initialRowsPerPage?: number;
  filterComponent?: React.ReactNode;
}

export function DataTable<T>({
  data = [],
  columns,
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  exportFileName = 'export',
  initialRowsPerPage = 10,
  filterComponent,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Handle sorting
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by search term
    if (searchTerm.trim() !== '' && searchKeys.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const val = row[key];
          return val ? String(val).toLowerCase().includes(lowerSearch) : false;
        })
      );
    }

    // Sort data
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a: any, b: any) => {
        let aValue = a[key];
        let bValue = b[key];

        // Resolve function accessors or nested objects if key matches dot notation
        if (key.includes('.')) {
          const parts = key.split('.');
          aValue = parts.reduce((o, i) => (o ? o[i] : null), a);
          bValue = parts.reduce((o, i) => (o ? o[i] : null), b);
        }

        if (aValue === undefined || aValue === null) return direction === 'asc' ? 1 : -1;
        if (bValue === undefined || bValue === null) return direction === 'asc' ? -1 : 1;

        if (typeof aValue === 'string') {
          return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return direction === 'asc'
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
    }

    return result;
  }, [data, searchTerm, searchKeys, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIndex, startIndex + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (processedData.length === 0) return;
    
    // Extract headers
    const headers = columns.map((c) => c.header).join(',');
    
    // Map rows
    const rows = processedData.map((row) => {
      return columns
        .map((c) => {
          let val = '';
          if (typeof c.accessor === 'function') {
            // If accessor is custom function, try resolving string or using sortKey
            if (c.sortKey) {
              const parts = c.sortKey.split('.');
              const nestedVal = parts.reduce((o, i) => (o ? o[i] : null), row as any);
              val = nestedVal !== null && nestedVal !== undefined ? String(nestedVal) : '';
            } else {
              val = '';
            }
          } else {
            const rowVal = row[c.accessor];
            val = rowVal !== null && rowVal !== undefined ? String(rowVal) : '';
          }
          // Clean value for CSV formatting
          return `"${val.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n'); // Add BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFileName}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  return (
    <div className="space-y-4">
      {/* Table controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {filterComponent}
          <button
            onClick={handleExportCSV}
            disabled={processedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 disabled:opacity-50 transition border border-transparent dark:border-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="text-xs py-2 pl-2 pr-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
          >
            {[5, 10, 20, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} rows
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main table container */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              {columns.map((col, idx) => {
                const sortKey = col.sortKey || (typeof col.accessor === 'string' ? (col.accessor as string) : '');
                const isSorted = sortConfig?.key === sortKey;
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(sortKey, col.sortable)}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortable && sortKey && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortConfig?.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <div className="flex flex-col opacity-40">
                              <ChevronUp className="h-1.5 w-1.5 -mb-0.5" />
                              <ChevronDown className="h-1.5 w-1.5" />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-sm text-slate-400">
                  No records matching the search filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {columns.map((col, colIdx) => {
                    const content =
                      typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode);
                    return (
                      <td key={colIdx} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-350">
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <div>
          Showing {processedData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{' '}
          {Math.min(currentPage * rowsPerPage, processedData.length)} of {processedData.length} records
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const isCurrent = currentPage === pageNum;
            // Limit page button displays to prevent clutter
            if (totalPages > 5 && Math.abs(currentPage - pageNum) > 1 && pageNum !== 1 && pageNum !== totalPages) {
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return <span key={pageNum} className="px-1.5 py-1 select-none">...</span>;
              }
              return null;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                  isCurrent
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
