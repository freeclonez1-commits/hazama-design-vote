import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = 'mục'
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Hiển thị <strong>{startItem} - {endItem}</strong> trên tổng số <strong>{totalItems}</strong> {itemLabel}
      </span>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-outline"
          style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', opacity: currentPage === 1 ? 0.4 : 1 }}
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: page === currentPage ? 'none' : '1px solid var(--border)',
              backgroundColor: page === currentPage ? '#1D1D1F' : 'transparent',
              color: page === currentPage ? '#FFFFFF' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-outline"
          style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', opacity: currentPage === totalPages ? 0.4 : 1 }}
          title="Trang tiếp"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
