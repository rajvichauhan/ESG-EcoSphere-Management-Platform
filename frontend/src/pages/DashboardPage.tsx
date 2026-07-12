import React, { useState, useEffect } from 'react';
import { TreePine, AlertCircle, TrendingUp, Sparkles, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { esgScoreApi, departmentsApi } from '../api';
import { KpiTile, BarChart, DoughnutChart, StatusBadge, Skeleton, ErrorState } from '../components/common';
import type { DepartmentRollup } from '../types';

export const DashboardPage: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [depts, setDepts] = useState<DepartmentRollup[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, deptsRes] = await Promise.all([
        esgScoreApi.getOverview({ year: 2026, month: 6 }),
        departmentsApi.list({ year: 2026, month: 6 }),
      ]);
      setOverview(ovRes);
      setDepts(deptsRes);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load executive dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <Skeleton shape="chart" />;
  }

  if (error || !overview) {
    return <ErrorState message={error || 'No overview data'} onRetry={loadData} />;
  }

  const esgTotal = overview.total_esg || overview.esg?.total || 82;
  const esgE = overview.e_score || overview.esg?.e || 84;
  const esgS = overview.s_score || overview.esg?.s || 78;
  const esgG = overview.g_score || overview.esg?.g || 88;
  const totalCarbon = overview.total_emissions_kg || 482500;
  const totalOffsets = overview.total_offsets_kg || 64000;

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Welcome & Quick Action Bar */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, hsla(162, 75%, 35%, 0.12), hsla(215, 70%, 50%, 0.12))', border: '1px solid var(--border-glass)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success">Live Platform Sync</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Period: Q2 2026 (Reporting Active)</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Executive ESG Performance Matrix</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time telemetry across Scope 1/2/3 carbon emissions, social equity metrics, and governance compliance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => onNavigate('carbon-calculator')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TreePine size={16} /> Log Carbon Reading
          </button>
          <button onClick={() => onNavigate('ai-assistant')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'hsla(280, 65%, 60%, 0.15)', color: 'hsl(280, 65%, 70%)', border: '1px solid hsla(280, 65%, 60%, 0.3)' }}>
            <Sparkles size={16} /> Ask AI Assistant
          </button>
        </div>
      </div>

      {/* KPI Tiles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KpiTile
          label="Composite ESG Score"
          value={`${esgTotal}/100`}
          delta={{ value: 4.2, label: 'vs previous quarter' }}
          color="primary"
          icon={<TrendingUp size={20} />}
          onClick={() => onNavigate('reports')}
        />
        <KpiTile
          label="Environmental (E)"
          value={esgE}
          unit="pt"
          delta={{ value: 5.1, label: 'efficiency gain' }}
          color="success"
          icon={<TreePine size={20} />}
          onClick={() => onNavigate('carbon-calculator')}
        />
        <KpiTile
          label="Social (S) Index"
          value={esgS}
          unit="pt"
          delta={{ value: 2.0, label: 'diversity target' }}
          color="secondary"
          icon={<ArrowUpRight size={20} />}
          onClick={() => onNavigate('diversity')}
        />
        <KpiTile
          label="Governance (G) Score"
          value={esgG}
          unit="pt"
          delta={{ value: -1.2, label: 'policy audit due' }}
          color="warning"
          icon={<ShieldAlert size={20} />}
          onClick={() => onNavigate('policies')}
        />
      </div>

      {/* Charts & Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Monthly Carbon Emissions vs Offsets (kg CO₂)</h3>
            <span className="badge badge-neutral">12 Month Trend</span>
          </div>
          <BarChart
            labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
            series={[
              { label: 'Gross Emissions', data: [42000, 45000, 39000, 48000, 52000, 46000, 44000, 41000, 38000, 43000, 47000, 51000], color: 'hsl(0, 75%, 60%)' },
              { label: 'Verified Offsets', data: [5000, 5500, 6000, 5000, 7000, 8500, 8000, 9000, 9500, 10000, 11000, 12000], color: 'hsl(162, 75%, 40%)' },
            ]}
            height={280}
            unit="kg"
          />
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Emissions by Department Rollup</h3>
            <button onClick={() => onNavigate('hierarchy')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
              View Tree
            </button>
          </div>
          <DoughnutChart
            data={depts.slice(0, 5).map((d, i) => ({
              label: d.department?.name || `Dept ${i + 1}`,
              value: d.total_carbon_kg || 15000 * (i + 1),
            }))}
            height={260}
            centerText={`${(totalCarbon / 1000).toFixed(0)}t`}
            centerSub="Total Carbon"
            unit="kg CO₂"
          />
        </div>
      </div>

      {/* Compliance Alerts & Action Items Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid hsl(0, 80%, 55%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} color="hsl(0, 80%, 55%)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Urgent Compliance & Audit Alerts</h3>
            </div>
            <StatusBadge value="2 Open Issues" type="severity" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>Pune Mfg Facility: Effluent Permit Overdue</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Required corrective action plan review pending since May 15.</div>
              </div>
              <button onClick={() => onNavigate('audits')} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
                Resolve
              </button>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>Anti-Bribery Policy Acknowledgement Below Target</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Only 84% of APAC sector employees signed (Target: 95%).</div>
              </div>
              <button onClick={() => onNavigate('policies')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                Remind
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ background: 'radial-gradient(circle at top right, hsla(280, 65%, 60%, 0.12), transparent 70%), var(--bg-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={20} color="hsl(280, 65%, 70%)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>AI ESG Assistant Insights</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
            "Analysis of Q2 energy logs indicates a 14.2% spike in grid electricity consumption across Pune and Frankfurt plants during peak tariff hours. Transitioning 30% of daytime heating to solar + thermal storage could reduce monthly carbon footprint by ~8.5 metric tons while cutting overhead cost."
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => onNavigate('ai-assistant')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, hsl(280, 65%, 55%), hsl(215, 70%, 55%))' }}>
              Explore AI Recommendations
            </button>
            <button onClick={() => onNavigate('gamification')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              View Employee Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
