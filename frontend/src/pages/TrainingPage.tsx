import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Award, CheckCircle2, Clock } from 'lucide-react';
import { trainingsApi } from '../api';
import { DataTable, StatusBadge, Modal } from '../components/common';
import type { Training } from '../types';
import { useToast } from '../context/ToastContext';

export const TrainingPage: React.FC = () => {
  const { showToast } = useToast();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form
  const [title, setTitle] = useState('Anti-Greenwashing Compliance & Marketing Ethics');
  const [category, setCategory] = useState('Governance & Ethics');
  const [xp, setXp] = useState<number>(350);
  const [completion, setCompletion] = useState<number>(84);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await trainingsApi.list();
      setTrainings(data);
    } catch {
      showToast('Failed to load training modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trainingsApi.create({
        title,
        category,
        xp_reward: xp,
        completion_rate_percentage: completion,
        status: 'active',
      });
      showToast('Training module added to ESG Academy catalog!', 'success');
      setOpenModal(false);
      loadData();
    } catch {
      showToast('Could not save training module', 'error');
    }
  };

  return (
    <div className="training-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>ESG Academy: Training & Competency Development</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Mandatory compliance courses, sustainability upskilling, and employee gamified XP reward tracking.
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add Training Module
        </button>
      </div>

      {/* Catalog Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {trainings.map((t) => {
          const compPct = t.completion_rate_percentage || 0;
          return (
            <div key={t._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge badge-neutral">{t.category}</span>
                  <StatusBadge value={t.status || 'active'} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>{t.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(38, 92%, 50%)', fontWeight: 700 }}>
                    <Award size={16} /> +{t.xp_reward || 100} XP Reward
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> 45 min self-paced
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Organization Completion Rate:</span>
                  <span style={{ fontWeight: 800, color: compPct >= 90 ? 'hsl(162, 75%, 40%)' : compPct >= 70 ? 'var(--text-main)' : 'hsl(38, 92%, 50%)' }}>
                    {compPct}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ width: `${compPct}%`, height: '100%', background: compPct >= 90 ? 'hsl(162, 75%, 40%)' : 'hsl(215, 70%, 55%)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enrolled: 1,420 employees</span>
                  <button onClick={() => showToast(`Launched interactive module for "${t.title}"`, 'info')} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                    Launch Module
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Employee Course Completion Roster</h3>
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'title', header: 'Course / Training Title', sortable: true, render: (t) => <strong style={{ color: 'var(--text-main)' }}>{t.title}</strong> },
            { key: 'category', header: 'Category', render: (t) => <span className="badge badge-neutral">{t.category}</span> },
            { key: 'xp_reward', header: 'XP Reward', render: (t) => <span style={{ fontWeight: 700, color: 'hsl(38, 92%, 50%)' }}>+{t.xp_reward} XP</span> },
            { key: 'completion_rate_percentage', header: 'Completion Rate', sortable: true, render: (t) => <span className="badge badge-success">{t.completion_rate_percentage}%</span> },
            { key: 'status', header: 'Catalog Status', render: (t) => <StatusBadge value={t.status || 'active'} /> },
          ]}
          data={trainings}
        />
      </div>

      {/* Modal */}
      <Modal open={openModal} title="Register New ESG Training & Course Module" onClose={() => setOpenModal(false)} maxWidth="500px">
        <form onSubmit={handleCreateTraining}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>MODULE TITLE</label>
            <input type="text" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="Governance & Ethics">Governance & Ethics</option>
                <option value="Environmental Literacy">Environmental Literacy</option>
                <option value="Social Equity & DEI">Social Equity & DEI</option>
                <option value="Supply Chain Sustainability">Supply Chain Sustainability</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>XP REWARD</label>
              <input type="number" min="50" step="50" required className="input" value={xp} onChange={(e) => setXp(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>INITIAL COMPLETION RATE (%)</label>
            <input type="number" min="0" max="100" required className="input" value={completion} onChange={(e) => setCompletion(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Training Module</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
