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
  return (
    <div
      className={`kpi-tile glass-card kpi-border-${color}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span className="kpi-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {icon && (
          <div
            className={`kpi-icon-box bg-${color}`}
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: color === 'primary' ? 'hsla(162, 75%, 35%, 0.12)' : 'hsla(215, 70%, 50%, 0.12)',
              color: color === 'primary' ? 'hsl(162, 75%, 35%)' : 'hsl(215, 70%, 50%)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="kpi-value" style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>}
        </div>

        {delta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: delta.value > 0 ? 'hsl(162, 75%, 35%)' : delta.value < 0 ? 'hsl(0, 80%, 55%)' : 'var(--text-muted)',
            }}
          >
            {delta.value > 0 ? <TrendingUp size={15} /> : delta.value < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
            <span>{Math.abs(delta.value)}%</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '12px' }}>{delta.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
