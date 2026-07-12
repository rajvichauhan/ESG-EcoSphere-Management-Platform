import React, { useState, useEffect } from 'react';
import { Search, Plus, History, Eye, Edit3, Trash2, Database, Filter } from 'lucide-react';
import { carbonReferencesApi } from '../api';
import { DataTable, StatusBadge, Drawer, Modal } from '../components/common';
import type { CarbonReferenceRow, CarbonReferenceHistoryEntry } from '../types';
import { useToast } from '../context/ToastContext';

export const CarbonReferencesPage: React.FC = () => {
  const { showToast } = useToast();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // History Drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<CarbonReferenceHistoryEntry[]>([]);
  const [activeRow, setActiveRow] = useState<CarbonReferenceRow | null>(null);

  // New/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<CarbonReferenceRow>>({
    name: '',
    category: 'Electricity',
    kg_co2_per_unit: 0.5,
    unit: 'kWh',
    source: 'DEFRA 2026 Grid Standard',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await carbonReferencesApi.list();
      setRows(data);
    } catch {
      showToast('Failed to load carbon references', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenHistory = async (row: CarbonReferenceRow) => {
    setActiveRow(row);
    setHistoryOpen(true);
    try {
      const hist = await carbonReferencesApi.getHistory(row._id);
      setHistoryList(hist);
    } catch {
      showToast('Could not load factor audit trail', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem._id) {
        await carbonReferencesApi.update(editItem._id, editItem);
        showToast('Emission factor updated successfully', 'success');
      } else {
        await carbonReferencesApi.create(editItem as any);
        showToast('Created new emission reference factor', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch {
      showToast('Failed to save emission factor', 'error');
    }
  };

  const filteredRows = rows.filter((r: any) => {
    const matchesSearch = String(r.name || r.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(r.source || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || (r.category || r.product_category) === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...Array.from(new Set(rows.map((r) => r.category)))];

  return (
    <div className="carbon-references-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-card header-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderRadius: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Standardized ESG Library (#15)</span>
            <span className="badge badge-info">DEFRA & GHG Protocol 2026</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database className="text-primary" size={26} /> Verified Carbon Reference Factors
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Authoritative baseline emission factors used across the platform to compute scope 1, 2, and 3 footprint calculations.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setEditItem({ name: '', category: 'Electricity', kg_co2_per_unit: 0.5, unit: 'kWh', source: 'Custom Verification' });
              setModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <Plus size={16} /> Add Custom Factor
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search fuel, material, or activity..."
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 36, background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Filter size={15} /> Category:
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-main)' }}>{filteredRows.length}</strong> emission factors
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        isLoading={loading}
        columns={[
          { key: 'name', header: 'Activity / Fuel Name', sortable: true, render: (r: any) => <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{r.name || r.product_name || 'Item'}</strong> },
          { key: 'category', header: 'Category', sortable: true, render: (r: any) => <span className="badge badge-neutral">{r.category || r.product_category || 'General'}</span> },
          {
            key: 'kg_co2_per_unit',
            header: 'Emission Intensity',
            sortable: true,
            render: (r: any) => (
              <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>
                {r.kg_co2_per_unit ?? r.carbon_value ?? 0} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>kg CO₂ / {r.unit}</span>
              </span>
            ),
          },
          { key: 'source', header: 'Verification Source', render: (r: any) => <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.source || 'Standard'}</span> },
          {
            key: 'actions',
            header: 'Audit & Actions',
            align: 'right',
            render: (r: any) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => handleOpenHistory(r)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <History size={13} /> Audit Trail
                </button>
                <button
                  onClick={() => {
                    setEditItem(r);
                    setModalOpen(true);
                  }}
                  className="btn-icon"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  <Edit3 size={16} />
                </button>
              </div>
            ),
          },
        ]}
        data={filteredRows}
      />

      {/* Audit History Drawer */}
      <Drawer open={historyOpen} title={`Audit History: ${activeRow?.name || activeRow?.product_name || 'Factor'}`} onClose={() => setHistoryOpen(false)} width="480px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'hsla(162, 75%, 40%, 0.1)', border: '1px solid hsla(162, 75%, 40%, 0.3)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Active Value:</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'hsl(162, 75%, 40%)' }}>
              {activeRow?.kg_co2_per_unit ?? activeRow?.carbon_value ?? 0} kg CO₂ / {activeRow?.unit}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Source: {activeRow?.source || 'Standard'}</div>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', color: 'var(--text-main)' }}>
            Past Revision Log
          </h3>

          {historyList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No previous revisions recorded.</div>
          ) : (
            historyList.map((h: any, idx) => (
              <div key={h._id || idx} className="glass-card" style={{ padding: '14px', borderRadius: '12px', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    {h.old_value} → <span style={{ color: 'var(--color-primary)' }}>{h.new_value}</span> kg CO₂/{activeRow?.unit}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(h.changed_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Changed by: <strong style={{ color: 'var(--text-main)' }}>{h.changed_by || 'Admin'}</strong>
                </div>
                {h.reason && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>Reason: "{h.reason}"</div>}
              </div>
            ))
          )}
        </div>
      </Drawer>

      {/* New/Edit Modal */}
      <Modal open={modalOpen} title={editItem._id ? 'Edit Emission Factor' : 'Add Emission Factor'} onClose={() => setModalOpen(false)} maxWidth="500px">
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>FACTOR / ACTIVITY NAME</label>
            <input
              type="text"
              required
              className="input"
              value={editItem.name || ''}
              onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
              <select
                className="input"
                value={editItem.category || 'Electricity'}
                onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}
              >
                <option value="Electricity">Electricity</option>
                <option value="Stationary Combustion">Stationary Combustion</option>
                <option value="Mobile Combustion">Mobile Combustion</option>
                <option value="Logistics">Logistics & Transport</option>
                <option value="Waste & Water">Waste & Water</option>
                <option value="Industrial Process">Industrial Process</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>UNIT</label>
              <input
                type="text"
                required
                className="input"
                value={editItem.unit || ''}
                onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CO₂ INTENSITY (KG/UNIT)</label>
              <input
                type="number"
                required
                step="any"
                min="0"
                className="input"
                value={editItem.kg_co2_per_unit !== undefined ? editItem.kg_co2_per_unit : 0}
                onChange={(e) => setEditItem({ ...editItem, kg_co2_per_unit: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>SOURCE / REFERENCE</label>
              <input
                type="text"
                required
                className="input"
                value={editItem.source || ''}
                onChange={(e) => setEditItem({ ...editItem, source: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Reference Factor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
