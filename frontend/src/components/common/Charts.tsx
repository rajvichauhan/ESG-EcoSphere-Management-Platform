import React from 'react';

// Curated Editorial Chart Palette (Neutral grays + Slate + Accent Blue & Red)
export const CHART_COLORS = [
  '#1066e5', // Accent Blue
  '#71717a', // Muted Zinc Gray
  '#27272a', // Dark Zinc Gray
  '#4b5563', // Slate Gray
  '#a1a1aa', // Light Muted Zinc
  '#18181b', // Charcoal
  '#e02424', // Accent Red
];

export interface ChartDataSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface BarChartProps {
  labels: string[];
  series: ChartDataSeries[];
  height?: number;
  stacked?: boolean;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ labels, series, height = 260, stacked = false, unit = '' }) => {
  if (!labels || labels.length === 0 || !series || series.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data to chart</div>;
  }

  // Calculate max value for scaling
  let maxVal = 0;
  if (stacked) {
    for (let i = 0; i < labels.length; i++) {
      let sum = 0;
      for (const s of series) sum += s.data[i] || 0;
      if (sum > maxVal) maxVal = sum;
    }
  } else {
    for (const s of series) {
      for (const v of s.data) if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 100;

  return (
    <div className="chart-container" style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
        {labels.map((lbl, idx) => {
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
              <div style={{ width: '100%', display: 'flex', gap: stacked ? 0 : '4px', flexDirection: stacked ? 'column-reverse' : 'row', alignItems: 'flex-end', justifyContent: 'center', height: '85%' }}>
                {series.map((s, sIdx) => {
                  const val = s.data[idx] || 0;
                  const pct = (val / maxVal) * 100;
                  const color = s.color || CHART_COLORS[sIdx % CHART_COLORS.length];
                  return (
                    <div
                      key={sIdx}
                      title={`${s.label}: ${val.toLocaleString()}${unit ? ' ' + unit : ''}`}
                      style={{
                        flex: stacked ? `0 0 ${pct}%` : 1,
                        height: stacked ? undefined : `${pct}%`,
                        width: stacked ? '80%' : undefined,
                        background: color,
                        borderRadius: 0, // Sharp rectangular bars
                        transition: 'var(--transition-fast)',
                        minHeight: val > 0 ? '2px' : 0,
                        boxShadow: 'none', // Flat, no drop shadows
                      }}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
                {lbl}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, background: s.color || CHART_COLORS[i % CHART_COLORS.length] }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface DoughnutChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  centerText?: string;
  centerSub?: string;
  unit?: string;
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, height = 220, centerText, centerSub, unit = '' }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  // Build SVG conic or ring paths
  let accPct = 0;
  const size = 150;
  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {data.map((d, i) => {
            const pct = d.value / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -(accPct * circumference);
            accPct += pct;
            const color = d.color || CHART_COLORS[i % CHART_COLORS.length];

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
        </svg>

        {(centerText !== undefined || centerSub !== undefined) && (
          <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {centerText && <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)', lineHeight: 1 }}>{centerText}</span>}
            {centerSub && <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{centerSub}</span>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, background: color }} />
              <span style={{ color: 'var(--text-main)', minWidth: '90px' }}>{d.label}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {d.value.toLocaleString()} {unit} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
