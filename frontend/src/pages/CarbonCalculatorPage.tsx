import React, { useState, useEffect } from 'react';
import { TreePine, Plus, Trash2, History, TrendingDown } from 'lucide-react';
import { emissionFactorsApi, facilitiesApi, carbonTransactionsApi, departmentsApi } from '../api';
import { DataTable, StatusBadge, PeriodFilter, Modal, KpiTile, BarChart } from '../components/common';
import type { EmissionFactor, FacilityReading, CarbonTransaction, Period } from '../types';
import { useToast } from '../context/ToastContext';

export const CarbonCalculatorPage: React.FC = () => {
  const { showToast } = useToast();

  const [period, setPeriod] = useState<Period>({ year: 2026, month: 6 });
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [readings, setReadings] = useState<FacilityReading[]>([]);
  const [transactions, setTransactions] = useState<CarbonTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // New reading form
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [unitOverride, setUnitOverride] = useState('');
  const [notes, setNotes] = useState('Monthly utility meter reading');
  const [facilityId, setFacilityId] = useState('fac_mfg_pune');

  // Offset form
  const [openOffsetModal, setOpenOffsetModal] = useState(false);
  const [offsetProject, setOffsetProject] = useState('Solar Wind Hybrid Grid Power - Maharashtra');
  const [offsetKg, setOffsetKg] = useState<number>(5000);
  const [offsetCert, setOffsetCert] = useState('CERT-VCS-2026-8891');

  const loadData = async () => {
    setLoading(true);
    try {
      const [facsRes, readRes, transRes] = await Promise.all([
        emissionFactorsApi.list(),
        facilitiesApi.listReadings(facilityId),
        carbonTransactionsApi.list(),
      ]);
      setFactors(facsRes);
      setReadings(readRes);
      setTransactions(transRes);
      if (facsRes.length > 0 && !selectedFactorId) {
        setSelectedFactorId(facsRes[0]._id);
        setUnitOverride(facsRes[0].unit);
      }
    } catch {
      showToast('Error loading carbon calculator data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [facilityId, period]);

  const activeFactor = factors.find((f) => f._id === selectedFactorId) || factors[0];
  const calculatedCo2 = activeFactor ? quantity * activeFactor.kg_co2_per_unit : 0;

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFactor) return;
    try {
      await facilitiesApi.createReading(facilityId, {
        type: activeFactor.name as any,
        value: quantity,
        unit: unitOverride || activeFactor.unit,
        period,
      });
      showToast(`Successfully recorded ${calculatedCo2.toLocaleString()} kg CO₂ emission reading`, 'success');
      setOpenAddModal(false);
      loadData();
    } catch {
      showToast('Could not save carbon reading', 'error');
    }
  };

  const handleCreateOffset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await carbonTransactionsApi.create({
        type: 'offset',
        project_name: offsetProject,
        amount_kg: offsetKg,
        certificate_id: offsetCert,
        price_usd: (offsetKg / 1000) * 18,
      });
      showToast(`Logged ${offsetKg.toLocaleString()} kg CO₂ verified offset transaction`, 'success');
      setOpenOffsetModal(false);
      loadData();
    } catch {
      showToast('Failed to log offset transaction', 'error');
    }
  };

  const handleDeleteReading = async (id: string) => {
    try {
      await facilitiesApi.deleteReading(facilityId, id);
      showToast('Reading deleted', 'info');
      loadData();
    } catch {
      showToast('Failed to delete reading', 'error');
    }
  };

  const totalEmissions = readings.reduce((sum, r) => sum + (r.co2_equivalent || r.value * 0.85), 0);
  const totalOffsets = transactions.reduce((sum, t) => sum + (t.type === 'offset' ? t.amount_kg : 0), 0);
  const netFootprint = totalEmissions - totalOffsets;

  return (
    <div className="carbon-calculator-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter & Actions */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>FACILITY / SCOPE</label>
            <select
              className="input"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}
            >
              <option value="fac_mfg_pune">Pune Mfg Plant (India)</option>
              <option value="fac_mfg_frankfurt">Frankfurt Assembly Hub (Germany)</option>
              <option value="fac_hq_austin">Global HQ Austin (USA)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>REPORTING PERIOD</label>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setOpenOffsetModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingDown size={16} color="hsl(162, 75%, 40%)" /> Record Offset / Credit
          </button>
          <button onClick={() => setOpenAddModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Log Carbon Reading
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <KpiTile label="Gross Scope 1 & 2 Emissions" value={`${Math.round(totalEmissions).toLocaleString()}`} unit="kg CO₂e" color="warning" icon={<TreePine size={20} />} />
        <KpiTile label="Verified Carbon Offsets" value={`${Math.round(totalOffsets).toLocaleString()}`} unit="kg CO₂e" color="success" icon={<TrendingDown size={20} />} />
        <KpiTile label="Net Carbon Footprint" value={`${Math.round(netFootprint).toLocaleString()}`} unit="kg CO₂e" color={netFootprint <= 0 ? 'success' : 'primary'} icon={<History size={20} />} />
      </div>

      {/* Charts & Breakdown */}
      <div className="glass-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Scope & Category Emissions Breakdown (kg CO₂ equivalent)</h3>
        <BarChart
          labels={readings.map((r) => r.type || 'Reading')}
          series={[{ label: 'CO₂ Equivalent (kg)', data: readings.map((r) => r.co2_equivalent || r.value * 0.85), color: 'hsl(162, 75%, 40%)' }]}
          height={220}
          unit="kg"
        />
      </div>

      {/* Readings Table */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Activity & Meter Readings Log</h3>
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'type', header: 'Activity / Fuel Type', sortable: true, render: (r) => <strong style={{ color: 'var(--text-main)' }}>{r.type}</strong> },
            { key: 'value', header: 'Consumption Value', render: (r) => `${r.value.toLocaleString()} ${r.unit}` },
            { key: 'co2_equivalent', header: 'Calculated CO₂e', render: (r) => <span className="badge badge-warning" style={{ fontSize: '13px' }}>{(r.co2_equivalent || r.value * 0.85).toLocaleString()} kg CO₂</span> },
            { key: 'period', header: 'Period', render: (r) => `${r.period ? `${r.period.month}/${r.period.year}` : 'Current'}` },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (r) => (
                <button onClick={() => handleDeleteReading(r._id)} className="btn-icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(0, 80%, 55%)' }}>
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
          data={readings}
        />
      </div>

      {/* Offsets Table */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Carbon Offset Transactions Repository</h3>
        <DataTable
          columns={[
            { key: 'project_name', header: 'Offset Project Name', render: (t) => <strong style={{ color: 'var(--text-main)' }}>{t.project_name}</strong> },
            { key: 'certificate_id', header: 'Certificate ID', render: (t) => <code style={{ color: 'var(--color-primary)' }}>{t.certificate_id}</code> },
            { key: 'amount_kg', header: 'Verified Offsets', render: (t) => <span className="badge badge-success">{t.amount_kg.toLocaleString()} kg CO₂</span> },
            { key: 'price_usd', header: 'Cost (USD)', render: (t) => `$${(t.price_usd || 0).toLocaleString()}` },
            { key: 'created_at', header: 'Date Logged', render: (t) => new Date(t.created_at || Date.now()).toLocaleDateString() },
          ]}
          data={transactions}
        />
      </div>

      {/* Modal: Log New Reading */}
      <Modal open={openAddModal} title="Log Activity / Meter Reading" onClose={() => setOpenAddModal(false)} maxWidth="520px">
        <form onSubmit={handleAddReading}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>EMISSION FACTOR / ACTIVITY TYPE</label>
            <select
              className="input"
              value={selectedFactorId}
              onChange={(e) => {
                setSelectedFactorId(e.target.value);
                const f = factors.find((i) => i._id === e.target.value);
                if (f) setUnitOverride(f.unit);
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}
            >
              {factors.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.kg_co2_per_unit} kg CO₂ / {f.unit})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CONSUMPTION QUANTITY</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>UNIT</label>
              <input
                type="text"
                className="input"
                value={unitOverride}
                onChange={(e) => setUnitOverride(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'hsla(162, 75%, 40%, 0.12)', border: '1px solid hsla(162, 75%, 40%, 0.3)', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CALCULATED CARBON IMPACT:</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'hsl(162, 75%, 40%)', fontFamily: 'var(--font-display)' }}>
              {calculatedCo2.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>kg CO₂ equivalent</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenAddModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Carbon Reading
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Offset */}
      <Modal open={openOffsetModal} title="Record Carbon Offset / Credit Certificate" onClose={() => setOpenOffsetModal(false)} maxWidth="520px">
        <form onSubmit={handleCreateOffset}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>PROJECT NAME</label>
            <input
              type="text"
              required
              className="input"
              value={offsetProject}
              onChange={(e) => setOffsetProject(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>OFFSET AMOUNT (KG CO₂)</label>
              <input
                type="number"
                required
                min="1"
                className="input"
                value={offsetKg}
                onChange={(e) => setOffsetKg(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CERTIFICATE ID</label>
              <input
                type="text"
                required
                className="input"
                value={offsetCert}
                onChange={(e) => setOffsetCert(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenOffsetModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Verify & Record Offset
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
