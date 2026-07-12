import React, { useState } from 'react';
import { TreePine, Lock, Mail, User, Building, ArrowRight, ShieldCheck, CheckCircle2, Landmark, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onViewPublicPolicies?: () => void;
  onBackToLanding?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onViewPublicPolicies,
  onBackToLanding,
}) => {
  const { login, verifyOtp, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [step, setStep] = useState<'creds' | 'otp'>('creds');
  
  // Registration paths: 'corporate' (new organization creation) or 'individual' (joining an existing organization)
  const [regPath, setRegPath] = useState<'corporate' | 'individual'>('corporate');

  // Form fields
  const [email, setEmail] = useState('orgadmin@ecosphere.demo');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Sarah Jenkins (Sustainability Dir)');
  
  // Corporate specific
  const [orgName, setOrgName] = useState('Acme Sustainability Group');
  const [orgId, setOrgId] = useState('org_acme_001');
  const [industrySector, setIndustrySector] = useState('Manufacturing');
  
  // Individual specific
  const [inviteCode, setInviteCode] = useState('INV-ACME-4022');

  const [otpCode, setOtpCode] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleSubmitCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res?.otpRequired || email.includes('demo') || email.includes('admin') || true) {
          setStep('otp');
          showToast('Verification code sent to your email (Demo code: 123456)', 'info');
        } else {
          onSuccess();
        }
      } else {
        // Registration submission
        const submitData = {
          email,
          password,
          full_name: fullName,
          // If individual, join existing org, else configure new org
          org_id: regPath === 'individual' ? inviteCode : orgId,
          // Additional metadata for corporate path
          org_name: regPath === 'corporate' ? orgName : undefined,
          sector: regPath === 'corporate' ? industrySector : undefined,
        };
        await register(submitData);
        showToast('Registration complete! Verification code sent.', 'success');
        setStep('otp');
      }
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Authentication failed. Check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(email, otpCode, mode === 'login' ? 'login' : 'register');
      showToast('Authentication successful. Session established.', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err?.detail || 'Invalid verification code. Use 123456 for demo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px 32px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              width: 42,
              height: 42,
              border: '1px solid var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              marginBottom: '12px',
            }}
          >
            <TreePine size={24} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            EcoSphere Platform
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Enterprise Sustainability, Carbon Intelligence & Governance
          </p>
        </div>

        {step === 'creds' ? (
          <form onSubmit={handleSubmitCreds}>
            {/* Login / Register Tab Switches */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setEmail('orgadmin@ecosphere.demo');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'login' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: mode === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setEmail('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'register' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: mode === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Register
              </button>
            </div>

            {/* Split registration paths */}
            {mode === 'register' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
                <button
                  type="button"
                  onClick={() => setRegPath('corporate')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: regPath === 'corporate' ? 'var(--bg-card)' : 'transparent',
                    border: regPath === 'corporate' ? '1px solid var(--border-subtle)' : 'none',
                    color: regPath === 'corporate' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  <Landmark size={12} />
                  Corporate Org
                </button>
                <button
                  type="button"
                  onClick={() => setRegPath('individual')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: regPath === 'individual' ? 'var(--bg-card)' : 'transparent',
                    border: regPath === 'individual' ? '1px solid var(--border-subtle)' : 'none',
                    color: regPath === 'individual' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  <UserCheck size={12} />
                  Individual User
                </button>
              </div>
            )}

            {/* Common Name field for Registration */}
            {mode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    required
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            )}

            {/* Corporate Registration Pathway */}
            {mode === 'register' && regPath === 'corporate' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label>Organization Name</label>
                  <div style={{ position: 'relative' }}>
                    <Building size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      required
                      className="input"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme Industries Ltd."
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label>Org ID (Target Code)</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      placeholder="org_acme_001"
                    />
                  </div>
                  <div>
                    <label>Industry Sector</label>
                    <select
                      className="input"
                      value={industrySector}
                      onChange={(e) => setIndustrySector(e.target.value)}
                    >
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Energy & Power">Energy & Power</option>
                      <option value="Tech & Services">Tech & Services</option>
                      <option value="Retail & Goods">Retail & Goods</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Individual Registration Pathway */}
            {mode === 'register' && regPath === 'individual' && (
              <div style={{ marginBottom: '16px' }}>
                <label>Organization Invite Code</label>
                <div style={{ position: 'relative' }}>
                  <Building size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    required
                    className="input"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. INV-ACME-4022"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Obtain this from your administrator to join an existing organization ledger.
                </span>
              </div>
            )}

            {/* Email Address */}
            <div style={{ marginBottom: '16px' }}>
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@organization.com"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>Password</label>
                {mode === 'login' && <span style={{ fontSize: '11px', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}>Forgot?</span>}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="password"
                  required
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In & Verify' : 'Create Platform Account'}</span>
              <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </button>

            {mode === 'login' && (
              <>
                {/* Demo Accounts Panel */}
                <div style={{ marginTop: '20px', padding: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Demo Credentials
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Master Admin: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>master@ecosphere.demo</code></div>
                    <div>Org Admin: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>orgadmin@ecosphere.demo</code></div>
                    <div>Dept Head: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>depthead@ecosphere.demo</code></div>
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', fontStyle: 'italic' }}>Any password works. MFA verification code: `123456`.</div>
                  </div>
                </div>

                {onViewPublicPolicies && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={onViewPublicPolicies}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                    >
                      View Public Policies & Disclosures
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: 48, height: 48, border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>Multi-Factor Authentication</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Enter the 6-digit verification code sent to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  width: '180px',
                  padding: '10px',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '6px',
                  textAlign: 'center',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              <CheckCircle2 size={16} style={{ marginRight: '4px' }} />
              <span>Verify & Launch Platform</span>
            </button>

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('creds')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back to credentials
              </button>
            </div>
          </form>
        )}

        {onBackToLanding && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onBackToLanding}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ← Back to Portal Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
