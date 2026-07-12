import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Shield, TrendingUp, Plus } from 'lucide-react';
import { diversityMetricsApi } from '../api';
import { DataTable, KpiTile, DoughnutChart, BarChart, Modal } from '../components/common';
import type { DiversityMetric } from '../types';
import { useToast } from '../context/ToastContext';

export const DiversityPage: React.FC = () => {
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<DiversityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form
  const [category, setCategory] = useState('Gender Representation (Global)');
  const [demographic, setDemographic] = useState('Female Leadership %');
  const [value, setValue] = useState<number>(44.5);
  const [unit, setUnit] = useState('%');
  const [target, setTarget] = useState<number>(50.0);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await diversityMetricsApi.list();
      setMetrics(data);
    } catch {
      showToast('Could not load diversity metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await diversityMetricsApi.create({
        category,
        demographic,
        value,
        unit,
        target_value: target,
        period: { year: 2026, month: 6 },
      });
      showToast('Diversity benchmark recorded', 'success');
      setOpenModal(false);
      loadData();
    } catch {
      showToast('Failed to save benchmark', 'error');
    }
  };

  return (
    <div className="diversity-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Diversity, Equity & Inclusion (DEI) Telemetry</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Workforce demographic representation, pay equity indices, and board diversity reporting.
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Log DEI Metric
        </button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <KpiTile label="Female Workforce Share" value="46.2%" delta={{ value: 2.8, label: 'YoY growth' }} color="primary" icon={<Users size={20} />} />
        <KpiTile label="Women in Exec Leadership" value="41.5%" delta={{ value: 4.0, label: 'vs 2025 benchmark' }} color="secondary" icon={<UserCheck size={20} />} />
        <KpiTile label="Unadjusted Pay Equity Ratio" value="0.982" unit="USD/USD" delta={{ value: 1.1, label: 'closing gender gap' }} color="success" icon={<Shield size={20} />} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Global Workforce Gender Distribution</h3>
          <DoughnutChart
            data={[
              { label: 'Female Employees', value: 4620, color: 'hsl(340, 75%, 55%)' },
              { label: 'Male Employees', value: 5180, color: 'hsl(215, 70%, 55%)' },
              { label: 'Non-Binary & Undeclared', value: 200, color: 'hsl(280, 65%, 60%)' },
            ]}
            height={240}
            centerText="10,000"
            centerSub="Total Headcount"
          />
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Representation by Job Grade Level (%)</h3>
          <BarChart
            labels={['Entry / Junior', 'Mid-Level Specialist', 'Senior Manager', 'Director & VP', 'Executive Board']}
            series={[
              { label: 'Female %', data: [52, 48, 43, 38, 41], color: 'hsl(340, 75%, 55%)' },
              { label: 'Underrepresented Minority %', data: [38, 35, 31, 26, 28], color: 'hsl(38, 92%, 50%)' },
            ]}
            height={240}
            unit="%"
          />
        </div>
      </div>

      {/* Metrics Table */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>DEI Audit & Benchmark Repository</h3>
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'category', header: 'Metric Category', render: (m) => <strong style={{ color: 'var(--text-main)' }}>{m.category}</strong> },
            { key: 'demographic', header: 'Demographic Group / Factor', render: (m) => <span className="badge badge-neutral">{m.demographic}</span> },
            {
              key: 'value',
              header: 'Recorded Value',
              render: (m) => (
                <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>
                  {m.value} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{m.unit}</span>
                </span>
              ),
            },
            { key: 'target_value', header: 'Target Goal', render: (m) => `${m.target_value || 'N/A'} ${m.unit}` },
            { key: 'period', header: 'Period', render: (m) => (m.period ? `${m.period.month}/${m.period.year}` : 'Current Q2') },
          ]}
          data={metrics}
        />
      </div>

      {/* Modal */}
      <Modal open={openModal} title="Log Diversity & Demographic Metric" onClose={() => setOpenModal(false)} maxWidth="500px">
        <form onSubmit={handleAddMetric}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
            <input type="text" required className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>DEMOGRAPHIC FACTOR</label>
              <input type="text" required className="input" value={demographic} onChange={(e) => setDemographic(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>UNIT</label>
              <input type="text" required className="input" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CURRENT VALUE</label>
              <input type="number" step="any" required className="input" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET GOAL</label>
              <input type="number" step="any" required className="input" value={target} onChange={(e) => setTarget(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save DEI Metric</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
