import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { environmentalGoalsApi } from '../api';
import { StatusBadge, Modal } from '../components/common';
import type { EnvironmentalGoal } from '../types';
import { useToast } from '../context/ToastContext';

export const GoalsPage: React.FC = () => {
  const { showToast } = useToast();

  const [goals, setGoals] = useState<EnvironmentalGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form
  const [title, setTitle] = useState('Net Zero Scope 2 Electricity by 2028');
  const [targetValue, setTargetValue] = useState<number>(100);
  const [currentValue, setCurrentValue] = useState<number>(64);
  const [unit, setUnit] = useState('% Renewable');
  const [targetDate, setTargetDate] = useState('2028-12-31');
  const [category, setCategory] = useState('Energy & Carbon');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await environmentalGoalsApi.list();
      setGoals(data);
    } catch {
      showToast('Error loading environmental targets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await environmentalGoalsApi.create({
        title,
        target_value: targetValue,
        current_value: currentValue,
        unit,
        target_date: targetDate,
        category,
        status: 'in progress',
      });
      showToast('New environmental target goal created!', 'success');
      setOpenModal(false);
      loadData();
    } catch {
      showToast('Could not create target goal', 'error');
    }
  };

  return (
    <div className="goals-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Environmental Targets & Net Zero Roadmaps</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Science-based targets (SBTi), renewable transition timelines, and waste reduction benchmarks.
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Establish New Target Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round(((goal.current_value || 0) / (goal.target_value || 1)) * 100));
          const isAchieved = goal.status === 'achieved' || pct >= 100;
          return (
            <div key={goal._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: isAchieved ? '3px solid var(--accent-blue)' : '3px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{goal.category}</span>
                  <StatusBadge value={isAchieved ? 'Achieved' : goal.status || 'In Progress'} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>{goal.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <Calendar size={14} /> Target Deadline: <strong style={{ color: 'var(--text-main)' }}>{new Date(goal.target_date || Date.now()).toLocaleDateString()}</strong>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Progress:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                    {goal.current_value} / {goal.target_value} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.unit}</span> ({pct}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: isAchieved ? 'var(--accent-blue)' : 'var(--text-muted)',
                      transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal open={openModal} title="Establish New Environmental Target Goal" onClose={() => setOpenModal(false)} maxWidth="520px">
        <form onSubmit={handleCreateGoal}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET GOAL TITLE</label>
            <input type="text" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="Energy & Carbon">Energy & Carbon</option>
                <option value="Water Stewardship">Water Stewardship</option>
                <option value="Zero Waste to Landfill">Zero Waste to Landfill</option>
                <option value="Supply Chain Scope 3">Supply Chain Scope 3</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET DATE</label>
              <input type="date" required className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CURRENT</label>
              <input type="number" required step="any" className="input" value={currentValue} onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET</label>
              <input type="number" required step="any" className="input" value={targetValue} onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>UNIT</label>
              <input type="text" required className="input" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Target Goal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
