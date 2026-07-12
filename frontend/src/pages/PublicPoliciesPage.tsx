import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Eye, MessageSquare, Send, Globe, Building2, User, Mail } from 'lucide-react';
import { policiesApi } from '../api';
import type { Policy } from '../types';
import { useToast } from '../context/ToastContext';
import { Modal, FilePreview, StatusBadge } from '../components/common';

interface PublicPoliciesPageProps {
  onBackToLogin: () => void;
}

export const PublicPoliciesPage: React.FC<PublicPoliciesPageProps> = ({ onBackToLogin }) => {
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail & Comments Modal
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Comment Form State
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [ngoName, setNgoName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // File Preview
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string }>({ url: null, name: '' });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await policiesApi.list();
      // Public page lists only policies that are public
      setPolicies(data);
    } catch (err) {
      showToast('Error loading public policy registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleSelectPolicy = async (policy: Policy) => {
    setSelectedPolicy(policy);
    setLoadingComments(true);
    try {
      const list = await policiesApi.getComments(policy._id);
      setComments(list);
    } catch {
      showToast('Could not load policy comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    if (!authorName.trim() || !authorEmail.trim() || !commentContent.trim()) {
      showToast('Please fill out all required comment fields.', 'warning');
      return;
    }

    setSubmittingComment(true);
    try {
      const roleStr = ngoName.trim() ? `NGO: ${ngoName.trim()}` : 'Public Observer';
      await policiesApi.createComment(selectedPolicy._id, {
        author_name: authorName.trim(),
        author_email: authorEmail.trim(),
        author_role: roleStr,
        content: commentContent.trim(),
      });
      showToast('Your comment was posted successfully!', 'success');
      
      // Clear comment text, keep name/email/ngo for convenience
      setCommentContent('');
      
      // Refresh comments
      const list = await policiesApi.getComments(selectedPolicy._id);
      setComments(list);
    } catch {
      showToast('Could not submit comment. Please try again.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 10% 20%, hsla(162, 75%, 35%, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsla(215, 70%, 50%, 0.1) 0%, transparent 40%), var(--bg-main)',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1080px' }}>
        {/* Navigation / Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <button
            onClick={onBackToLogin}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px' }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 700 }}>
            <Globe size={18} /> Public Registry Active
          </div>
        </div>

        {/* Hero Section */}
        <div className="glass-panel" style={{ padding: '32px 36px', borderRadius: '24px', marginBottom: '36px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, hsl(162, 75%, 40%), hsl(215, 70%, 55%))', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Sustainability & Governance Registry</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Open-access compliance frameworks, carbon mitigation policies, and public feedback channels.
              </p>
            </div>
          </div>
        </div>

        {/* Policies Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading public policies...</div>
        ) : policies.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '64px 24px', borderRadius: '24px' }}>
            <Globe size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Public Policies Published</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxW: '400px', margin: '0 auto' }}>
              The organization has not registered any public-facing ESG compliance policies yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {policies.map((p) => (
              <div
                key={p._id}
                className="glass-card"
                onClick={() => handleSelectPolicy(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderLeft: '4px solid var(--color-primary)',
                  transition: 'transform 0.2s ease',
                  padding: '24px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-neutral">{p.category || p.group}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>v{p.version}</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>{p.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                    {p.body_text || 'No preview summary available.'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', marginTop: '20px', paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Updated: {new Date(p.updated_at || p.published_at).toLocaleDateString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600 }}>
                    <MessageSquare size={13} /> View Comments & Detail
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Details & Commenting Modal */}
      {selectedPolicy && (
        <Modal
          open={!!selectedPolicy}
          title={selectedPolicy.title}
          onClose={() => setSelectedPolicy(null)}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="badge badge-neutral">{selectedPolicy.category || selectedPolicy.group}</span>
                <span className="badge badge-primary">Version v{selectedPolicy.version}</span>
              </div>
              <button
                onClick={() => setPreviewFile({ url: selectedPolicy.document_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', name: `${selectedPolicy.title}.pdf` })}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Eye size={14} /> Open Document
              </button>
            </div>

            {/* Body text */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>POLICY CHARTER SUMMARY</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                {selectedPolicy.body_text || 'This policy details compliance and carbon footprint auditing procedures.'}
              </p>
            </div>

            {/* Comments block */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} /> Public & NGO Comments ({comments.length})
              </h3>

              {/* List Comments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '6px' }}>
                {loadingComments ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                    No public reviews or NGO comments yet. Be the first to express feedback!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} className="glass-card" style={{ padding: '14px 18px', borderRadius: '12px', background: 'hsla(var(--hue-primary), 20%, 50%, 0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{c.author_name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{c.author_email}</span>
                        </div>
                        <span className={`badge ${c.author_role.includes('NGO') ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {c.author_role}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{c.content}</p>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="glass-panel" style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-glass)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Add Public / NGO Comment</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                    <input
                      type="text"
                      required
                      placeholder="Your Name *"
                      className="input"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                    <input
                      type="email"
                      required
                      placeholder="Your Email *"
                      className="input"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Building2 size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                  <input
                    type="text"
                    placeholder="NGO / Affiliation Name (e.g. WWF, Greenpeace) [Optional]"
                    className="input"
                    value={ngoName}
                    onChange={(e) => setNgoName(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Write your policy commentary here... *"
                    className="input"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    style={{ flexGrow: 1, fontSize: '12px' }}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 18px', fontSize: '13px' }}
                  >
                    <Send size={14} /> Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Document PDF Preview overlay */}
      <FilePreview
        url={previewFile.url}
        fileName={previewFile.name}
        onClose={() => setPreviewFile({ url: null, name: '' })}
      />
    </div>
  );
};
