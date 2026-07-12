import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, CheckCircle, AlertCircle, FileCheck, ArrowRight } from 'lucide-react';
import { auditsApi, complianceIssuesApi } from '../api';
import { DataTable, StatusBadge, Modal, KpiTile, Tabs } from '../components/common';
import type { AuditRecord, ComplianceIssue } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const AuditsPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('issues');
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Raise Issue
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState('Effluent Water Temperature Deviation');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [deptId, setDeptId] = useState('dept_mfg_pune');

  // Modal: Resolve Issue
  const [resolveModal, setResolveModal] = useState(false);
  const [activeIssue, setActiveIssue] = useState<ComplianceIssue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('Installed secondary cooling tower loop and recertified discharge sensors.');

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, iRes] = await Promise.all([auditsApi.list(), complianceIssuesApi.list()]);
      setAudits(aRes);
      setIssues(iRes);
    } catch {
      showToast('Error loading audits and compliance items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await complianceIssuesApi.create({
        department_id: deptId,
        title,
        severity,
        status: 'open',
        raised_by: user?._id || 'user_demo',
      });
      showToast('Non-compliance issue raised and assigned to department head', 'warning');
      setOpenModal(false);
      loadData();
    } catch {
      showToast('Could not record compliance issue', 'error');
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) return;
    try {
      await complianceIssuesApi.update(activeIssue._id, {
        status: 'resolved',
        resolved_by: user?._id || 'user_demo',
        resolved_at: new Date().toISOString(),
      });
      showToast('Compliance issue marked as resolved and verified', 'success');
      setResolveModal(false);
      loadData();
    } catch {
      showToast('Could not resolve issue', 'error');
    }
  };

  const openIssuesCount = issues.filter((i) => i.status === 'open').length;
  const criticalCount = issues.filter((i) => i.status === 'open' && i.severity === 'critical').length;

  return (
    <div className="audits-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Audit Readiness & Compliance Issue Tracker</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            External assurance logs (ISO 14001, CSRD, SECR), non-conformity tracking, and corrective action workflows.
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Raise Non-Compliance Issue
        </button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <KpiTile label="Open Non-Compliance Items" value={openIssuesCount} color={openIssuesCount > 0 ? 'danger' : 'success'} icon={<AlertCircle size={20} />} />
        <KpiTile label="Critical Severity Alerts" value={criticalCount} color={criticalCount > 0 ? 'danger' : 'primary'} icon={<ShieldAlert size={20} />} />
        <KpiTile label="Completed Assurance Audits" value={audits.length} color="success" icon={<FileCheck size={20} />} />
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'issues', label: 'Compliance Issues & Corrective Actions', icon: <AlertCircle size={16} />, badge: openIssuesCount },
          { key: 'audits', label: 'External Assurance & Audit Records', icon: <FileCheck size={16} />, badge: audits.length },
        ]}
      />

      {/* Tab 1: Compliance Issues */}
      {activeTab === 'issues' && (
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'title', header: 'Non-Compliance / Finding', sortable: true, render: (i) => <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{i.title}</strong> },
            { key: 'department_id', header: 'Department ID', render: (i) => <code style={{ color: 'var(--color-primary)' }}>{i.department_id}</code> },
            { key: 'severity', header: 'Severity', sortable: true, render: (i) => <StatusBadge value={i.severity} type="severity" /> },
            { key: 'status', header: 'Status', sortable: true, render: (i) => <StatusBadge value={i.status} /> },
            { key: 'created_at', header: 'Date Raised', render: (i) => new Date(i.created_at || Date.now()).toLocaleDateString() },
            {
              key: 'actions',
              header: 'Corrective Action',
              align: 'right',
              render: (i) =>
                i.status === 'open' ? (
                  <button
                    onClick={() => {
                      setActiveIssue(i);
                      setResolveModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                  >
                    <span>Resolve Issue</span> <ArrowRight size={14} />
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'hsl(162, 75%, 40%)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <CheckCircle size={14} /> Verified Resolved
                  </span>
                ),
            },
          ]}
          data={issues}
        />
      )}

      {/* Tab 2: Audit Records */}
      {activeTab === 'audits' && (
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'auditor', header: 'Assurance Body / Auditor', sortable: true, render: (a) => <strong style={{ color: 'var(--text-main)' }}>{a.auditor || 'DNV GL Assurance'}</strong> },
            { key: 'scope', header: 'Audit Scope & Standard', render: (a) => <span className="badge badge-neutral">{a.scope || 'ISO 14064-1 Carbon'}</span> },
            { key: 'findings_count', header: 'Findings / Deviations', render: (a) => <span className="badge badge-warning">{a.findings_count || 0} Findings</span> },
            { key: 'status', header: 'Status', render: (a) => <StatusBadge value={a.status || 'completed'} /> },
            { key: 'audit_date', header: 'Audit Date', render: (a) => new Date(a.audit_date || Date.now()).toLocaleDateString() },
          ]}
          data={audits}
        />
      )}

      {/* Modal: Raise Issue */}
      <Modal open={openModal} title="Raise Non-Compliance Issue & Alert Department" onClose={() => setOpenModal(false)} maxWidth="500px">
        <form onSubmit={handleCreateIssue}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>ISSUE TITLE / DESCRIPTION</label>
            <input type="text" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>DEPARTMENT ID</label>
              <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="dept_mfg_pune">Mfg Pune Plant</option>
                <option value="dept_mfg_frankfurt">Frankfurt Assembly Hub</option>
                <option value="dept_logistics">Global Logistics</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>SEVERITY LEVEL</label>
              <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-danger">Submit Compliance Issue</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resolve Issue */}
      <Modal open={resolveModal} title={`Corrective Action Plan: ${activeIssue?.title}`} onClose={() => setResolveModal(false)} maxWidth="520px">
        <form onSubmit={handleResolveIssue}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CORRECTIVE ACTION & VERIFICATION NOTES</label>
            <textarea
              required
              rows={4}
              className="input"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontSize: '13px', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setResolveModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> Mark Verified & Resolved
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
