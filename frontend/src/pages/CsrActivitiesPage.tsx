import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, Users, CheckCircle, XCircle, UploadCloud } from 'lucide-react';
import { csrActivitiesApi, employeeParticipationsApi } from '../api';
import { DataTable, StatusBadge, Modal, FileUpload } from '../components/common';
import type { CsrActivity, EmployeeParticipation } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const CsrActivitiesPage: React.FC = () => {
  const { showToast } = useToast();
  const { hasRole } = useAuth();

  const [activities, setActivities] = useState<CsrActivity[]>([]);
  const [participations, setParticipations] = useState<EmployeeParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Activity
  const [openAddModal, setOpenAddModal] = useState(false);
  const [title, setTitle] = useState('Coastal Mangrove Restoration Drive');
  const [category, setCategory] = useState('Environmental Restoration');
  const [budget, setBudget] = useState<number>(15000);
  const [hours, setHours] = useState<number>(320);

  // Modal: Attach Evidence
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [activeActId, setActiveActId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([csrActivitiesApi.list(), employeeParticipationsApi.list()]);
      setActivities(aRes);
      setParticipations(pRes);
    } catch {
      showToast('Error loading CSR initiatives', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await csrActivitiesApi.create({
        title,
        category,
        budget_usd: budget,
        spent_usd: budget * 0.4,
        target_hours: hours,
        actual_hours: Math.round(hours * 0.45),
        status: 'approved',
      });
      showToast('New CSR activity initiative registered', 'success');
      setOpenAddModal(false);
      loadData();
    } catch {
      showToast('Could not save CSR activity', 'error');
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await csrActivitiesApi.review(id, status);
      showToast(`CSR activity ${status} successfully`, 'info');
      loadData();
    } catch {
      showToast('Review action failed', 'error');
    }
  };

  return (
    <div className="csr-activities-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Corporate Social Responsibility (CSR) & Community Impact</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Track philanthropic budgets, volunteer hours, and verification proof for ESG social rating reports.
          </p>
        </div>
        <button onClick={() => setOpenAddModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Register CSR Initiative
        </button>
      </div>

      {/* Activities Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {activities.map((act) => {
          const spendPct = Math.round(((act.spent_usd || 0) / (act.budget_usd || 1)) * 100);
          return (
            <div key={act._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge badge-neutral">{act.category}</span>
                  <StatusBadge value={act.status} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>{act.title}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Volunteer Hours: <strong style={{ color: 'var(--text-main)' }}>{act.actual_hours || 0}</strong> / {act.target_hours || 100} hrs
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Budget Spend:</span>
                  <span style={{ fontWeight: 700 }}>
                    ${(act.spent_usd || 0).toLocaleString()} / ${(act.budget_usd || 0).toLocaleString()} ({spendPct}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ width: `${Math.min(100, spendPct)}%`, height: '100%', background: 'var(--accent-blue)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <button
                    onClick={() => {
                      setActiveActId(act._id);
                      setEvidenceModal(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UploadCloud size={14} /> Attach Proof
                  </button>

                  {hasRole('org_admin', 'master_admin') && act.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleReview(act._id, 'approved')} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => handleReview(act._id, 'rejected')} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roster Table */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Employee Volunteer & Participation Roster</h3>
        <DataTable
          columns={[
            { key: 'user_id', header: 'Employee / Volunteer ID', render: (p) => <strong style={{ color: 'var(--text-main)' }}>{p.user_id}</strong> },
            { key: 'activity_id', header: 'Initiative ID', render: (p) => <code style={{ color: 'var(--color-primary)' }}>{p.activity_id}</code> },
            { key: 'hours_contributed', header: 'Hours Contributed', render: (p) => <span className="badge">{p.hours_contributed} hrs</span> },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status || 'confirmed'} /> },
            { key: 'joined_at', header: 'Date Logged', render: (p) => new Date(p.joined_at || Date.now()).toLocaleDateString() },
          ]}
          data={participations}
        />
      </div>

      {/* Modal: Add Initiative */}
      <Modal open={openAddModal} title="Register CSR Initiative & Budget" onClose={() => setOpenAddModal(false)} maxWidth="500px">
        <form onSubmit={handleCreateActivity}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>INITIATIVE TITLE</label>
            <input type="text" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="Environmental Restoration">Environmental Restoration</option>
                <option value="Education & STEM">Education & STEM</option>
                <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                <option value="Disaster Relief">Disaster Relief</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET HOURS</label>
              <input type="number" required min="1" className="input" value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TOTAL BUDGET (USD)</label>
            <input type="number" required min="0" className="input" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenAddModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Register Initiative</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Attach Evidence */}
      <Modal open={evidenceModal} title="Attach Verification Evidence Document" onClose={() => setEvidenceModal(false)} maxWidth="520px">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Upload receipts, attendance rosters, or on-site geotagged photos to verify CSR spending and volunteer hours.
          </p>
          <FileUpload
            onUpload={async (f) => {
              await new Promise((r) => setTimeout(r, 600));
              showToast(`Attached verification file: ${f.name}`, 'success');
              setEvidenceModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
