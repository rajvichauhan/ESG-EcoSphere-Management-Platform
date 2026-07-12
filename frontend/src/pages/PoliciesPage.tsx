import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Eye, FileText, CheckSquare, AlertTriangle } from 'lucide-react';
import { policiesApi } from '../api';
import { DataTable, StatusBadge, Modal, FilePreview } from '../components/common';
import type { Policy } from '../types';
import { useToast } from '../context/ToastContext';

export const PoliciesPage: React.FC = () => {
  const { showToast } = useToast();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form
  const [title, setTitle] = useState('Global Human Rights & Supply Chain Ethics Policy v3.2');
  const [category, setCategory] = useState('Governance');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string }>({ url: null, name: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await policiesApi.list();
      setPolicies(data);
    } catch {
      showToast('Error loading policy repository', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await policiesApi.create({
        title,
        category,
        status,
        version: '3.2',
        document_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      });
      showToast('New governance policy published successfully', 'success');
      setOpenModal(false);
      loadData();
    } catch {
      showToast('Could not save policy', 'error');
    }
  };

  return (
    <div className="policies-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Policy Management & Governance Frameworks</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Corporate charters, ESG compliance policies, document control, and mandatory employee sign-off tracking.
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Publish New Policy
        </button>
      </div>

      {/* Policy Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {policies.map((p) => (
          <div key={p._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: p.status === 'published' ? '4px solid hsl(162, 75%, 40%)' : '4px solid var(--text-muted)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="badge badge-neutral">{p.category}</span>
                <StatusBadge value={p.status} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>{p.title}</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>Version: <strong style={{ color: 'var(--text-main)' }}>v{p.version || '1.0'}</strong></span>
                <span>•</span>
                <span>Updated: {new Date(p.updated_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'hsl(162, 75%, 40%)', fontWeight: 600 }}>
                <CheckSquare size={16} /> 96% Employee Acknowledged
              </div>
              <button
                onClick={() => setPreviewFile({ url: p.document_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', name: `${p.title}.pdf` })}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Eye size={14} /> Preview Document
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table view */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Document Control Registry & Acknowledgment Log</h3>
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'title', header: 'Policy Document Title', sortable: true, render: (p) => <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{p.title}</strong> },
            { key: 'category', header: 'Governance Area', render: (p) => <span className="badge badge-neutral">{p.category}</span> },
            { key: 'version', header: 'Version', render: (p) => `v${p.version || '1.0'}` },
            { key: 'status', header: 'Document Status', sortable: true, render: (p) => <StatusBadge value={p.status} /> },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (p) => (
                <button
                  onClick={() => setPreviewFile({ url: p.document_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', name: `${p.title}.pdf` })}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                >
                  <Eye size={13} /> Open File
                </button>
              ),
            },
          ]}
          data={policies}
        />
      </div>

      {/* Modal */}
      <Modal open={openModal} title="Publish Governance Policy Document" onClose={() => setOpenModal(false)} maxWidth="500px">
        <form onSubmit={handleCreatePolicy}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>POLICY TITLE</label>
            <input type="text" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CATEGORY</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="Governance">Governance</option>
                <option value="Ethics & Anti-Bribery">Ethics & Anti-Bribery</option>
                <option value="Environmental Compliance">Environmental Compliance</option>
                <option value="Human Rights">Human Rights</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>STATUS</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}>
                <option value="published">Published (Active)</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Publish Policy</button>
          </div>
        </form>
      </Modal>

      {/* File Preview */}
      <FilePreview url={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile({ url: null, name: '' })} />
    </div>
  );
};
