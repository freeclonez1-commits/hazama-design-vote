import React from 'react';
import type { Design, Variant } from '../types/models';
import { Check, AlertTriangle, HelpCircle } from 'lucide-react';

interface DesignCardProps {
  design: Design;
  variants: Variant[];
  selected?: boolean;
  onSelect?: () => void;
  onViewDetails?: () => void;
  selectable?: boolean;
  isAdmin?: boolean;
  onEdit?: () => void;
}

const COLORS_MAP: Record<string, string> = {
  black: '#1C1C1E',
  white: '#FFFFFF',
  grey: '#8E8E93',
  navy: '#1D2E44',
  beige: '#E5D3B3',
  red: '#FF3B30',
  blue: '#007AFF',
  green: '#34C759',
  brown: '#A2845E',
  pink: '#FF2D55',
  purple: '#AF52DE',
  yellow: '#FFCC00',
  orange: '#FF9500'
};

export const DesignCard: React.FC<DesignCardProps> = ({
  design,
  variants,
  selected = false,
  onSelect,
  onViewDetails,
  selectable = true,
  isAdmin = false,
  onEdit
}) => {
  const uniqueColors = Array.from(new Set(variants.map(v => v.color)));
  
  // Check completion status (does it have front AND back?)
  const hasFront = variants.some(v => v.view === 'f');
  const hasBack = variants.some(v => v.view === 'b');
  const isComplete = hasFront && hasBack;

  // Handle card click
  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect();
    }
  };

  const backVariant = variants.find(v => v.view === 'b');

  return (
    <div
      onClick={handleCardClick}
      className={`product-card ${selected ? 'product-card-selected' : ''}`}
    >
      {/* Image Preview Container */}
      <div className="product-image-container">
        {/* Selection Checkmark Overlay */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'var(--text-primary)',
              color: '#FFFFFF',
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              zIndex: 10
            }}
          >
            <Check size={12} strokeWidth={3} />
          </div>
        )}

        {/* Front view cover image */}
        {design.coverImageUrl ? (
          <img
            src={design.coverImageUrl}
            alt={design.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            loading="lazy"
          />
        ) : (
          <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={32} strokeWidth={1} />
            <span style={{ fontSize: '11px' }}>Không có ảnh</span>
          </div>
        )}

        {/* Back view hover image swap (fades in on hover) */}
        {backVariant && (
          <img
            src={backVariant.imageUrl}
            alt={`${design.name} back view`}
            className="product-card-hover-img"
            loading="lazy"
          />
        )}

        {/* Floating Badges */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: '4px', zIndex: 2 }}>
          {isComplete ? (
            <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px', fontWeight: 600 }}>Hoàn thiện</span>
          ) : (
            <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 6px', fontWeight: 600 }}>
              <AlertTriangle size={9} /> Thiếu {!hasFront ? 'mặt trước' : 'mặt sau'}
            </span>
          )}
        </div>

        {/* Quick View / Edit Hover Overlay */}
        <div className="product-image-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '80%', maxWidth: '140px' }}>
            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="btn-quickview"
              >
                Chi tiết
              </button>
            )}
            {isAdmin && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="btn-quickview"
                style={{ backgroundColor: '#1D1D1F', color: '#FFFFFF', border: 'none' }}
              >
                Sửa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '14px 8px 8px 8px', display: 'flex', flexDirection: 'column', flex: 1, gap: '4px', alignItems: 'center', textAlign: 'center' }}>
        {/* Color Dots Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', minHeight: '12px', marginTop: '2px', marginBottom: '6px' }}>
          {uniqueColors.map(c => (
            <span
              key={c}
              title={c}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor: COLORS_MAP[c] || '#CCCCCC',
                border: c === 'white' ? '1px solid #D2D2D7' : 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#1D1D1F',
            lineHeight: '1.35',
            margin: '0',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.2px'
          }}
        >
          {design.name}
        </h4>

        {/* Design Code Sub-label */}
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#8E8E93', letterSpacing: '0.2px', marginTop: '3px' }}>
          {design.code} • {uniqueColors.length} màu
        </span>
      </div>
    </div>
  );
};
