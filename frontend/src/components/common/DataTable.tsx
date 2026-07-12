import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, EmptyState, ErrorState } from './States';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  pageSize?: number;
  rowKey?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  error = null,
  onRetry,
  onSort,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display.',
  emptyAction,
  pageSize = 10,
  rowKey = (row) => row._id || row.id || JSON.stringify(row),
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return <Skeleton shape="table" rows={pageSize || 5} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const handleHeaderClick = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    const nextDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(col.key);
    setSortDir(nextDir);
    if (onSort) {
      onSort(col.key, nextDir);
    }
  };

  // Client-side sort fallback if onSort not provided
  let displayData = [...data];
  if (sortKey && !onSort) {
    displayData.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }

  const totalPages = Math.ceil(displayData.length / pageSize);
  const paginatedData = displayData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="table-container" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', gap: '4px' }}>
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      <span style={{ color: 'var(--accent-blue)' }}>
                        {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={rowKey(row) + '_' + idx}
                style={{
                  borderBottom: idx === paginatedData.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row, (currentPage - 1) * pageSize + idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, displayData.length)} of {displayData.length} entries
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
