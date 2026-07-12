import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; label: string };
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, unit, delta, icon, color = 'primary', onClick }) => {
  // Map delta direction colors to standard accents
  const isUp = delta && delta.value > 0;
  const isDown = delta && delta.value < 0;
  
  // Default delta color styling (e.g. blue for positive trend in ESG, red for warning)
  let deltaColor = 'var(--text-muted)';
  if (delta) {
    if (label.toLowerCase().includes('carbon') || label.toLowerCase().includes('emission')) {
      // For emissions, upward is bad (red), downward is good (blue)
      deltaColor = isUp ? 'var(--accent-red)' : isDown ? 'var(--accent-blue)' : 'var(--text-muted)';
    } else {
      // For standard scores, upward is good (blue), downward is bad (red)
      deltaColor = isUp ? 'var(--accent-blue)' : isDown ? 'var(--accent-red)' : 'var(--text-muted)';
    }
  }

  return (
    <div
      className="kpi-tile metric-card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span className="metric-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span className="metric-value" style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{unit}</span>}
        </div>

        {delta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: deltaColor,
            }}
          >
            {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
            <span>{Math.abs(delta.value)}%</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '2px' }}>{delta.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
