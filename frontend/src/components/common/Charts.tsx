import React from 'react';

// Curated categorical HSL palette (§7 Design System / Charts)
export const CHART_COLORS = [
  'hsl(162, 75%, 40%)', // Emerald
  'hsl(215, 70%, 55%)', // Blue
  'hsl(38, 92%, 50%)',  // Amber
  'hsl(280, 65%, 60%)', // Purple
  'hsl(340, 75%, 55%)', // Rose
  'hsl(180, 70%, 45%)', // Cyan
  'hsl(85, 65%, 45%)',  // Lime
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
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-glass)' }}>
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
                        borderRadius: stacked ? (sIdx === series.length - 1 ? '4px 4px 0 0' : 0) : '4px 4px 0 0',
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        minHeight: val > 0 ? '4px' : 0,
                        boxShadow: '0 2px 8px hsla(0, 0%, 0%, 0.15)',
                      }}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
                {lbl}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '3px', background: s.color || CHART_COLORS[i % CHART_COLORS.length] }} />
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
  const size = 160;
  const radius = 60;
  const strokeWidth = 24;
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
            {centerText && <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>{centerText}</span>}
            {centerSub && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{centerSub}</span>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ width: 12, height: 12, borderRadius: '3px', background: color }} />
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
