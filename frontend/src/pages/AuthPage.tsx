import React, { useState } from 'react';
import { TreePine, Lock, Mail, User, Building, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthPage: React.FC<{ onSuccess: () => void; onViewPublicPolicies?: () => void }> = ({ onSuccess, onViewPublicPolicies }) => {
  const { login, verifyOtp, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'creds' | 'otp'>('creds');

  // Form fields
  const [email, setEmail] = useState('orgadmin@ecosphere.demo');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Sarah Jenkins (Sustainability Dir)');
  const [orgId, setOrgId] = useState('org_acme_001');
  const [otpCode, setOtpCode] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleSubmitCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res?.otpRequired || email.includes('admin') || true) {
          setStep('otp');
          showToast('Verification code sent to your email (Demo code: 123456)', 'info');
        } else {
          onSuccess();
        }
      } else {
        await register({ email, password, full_name: fullName, org_id: orgId });
        showToast('Account created successfully! Please verify your email.', 'success');
        setMode('login');
        setStep('creds');
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
      showToast('Authentication successful! Welcome to EcoSphere.', 'success');
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
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        background: 'radial-gradient(circle at 15% 30%, hsla(162, 75%, 35%, 0.15) 0%, transparent 45%), radial-gradient(circle at 85% 75%, hsla(215, 70%, 50%, 0.15) 0%, transparent 45%), var(--bg-main)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 32px 80px hsla(0, 0%, 0%, 0.5)',
          border: '1px solid var(--border-glass)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, hsl(162, 75%, 40%), hsl(215, 70%, 55%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px hsla(162, 75%, 40%, 0.35)',
              marginBottom: '16px',
            }}
          >
            <TreePine size={32} />
          </div>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.5px',
              margin: 0,
              background: 'linear-gradient(135deg, hsl(162, 75%, 45%), hsl(215, 70%, 65%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            EcoSphere ESG Platform
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Enterprise Sustainability, Carbon Intelligence & Governance
          </p>
        </div>

        {step === 'creds' ? (
          <form onSubmit={handleSubmitCreds}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'login' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: mode === 'login' ? 'var(--color-primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'register' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: mode === 'register' ? 'var(--color-primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Register
              </button>
            </div>

            {mode === 'register' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    FULL NAME
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type="text"
                      required
                      className="input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      style={{ width: '100%', padding: '10px 14px 10px 42px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    ORGANIZATION ID / CODE
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type="text"
                      className="input"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      placeholder="e.g. org_acme_001"
                      style={{ width: '100%', padding: '10px 14px 10px 42px' }}
                    />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@ecosphere.com"
                  style={{ width: '100%', padding: '10px 14px 10px 42px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>PASSWORD</label>
                {mode === 'login' && <span style={{ fontSize: '12px', color: 'var(--color-primary)', cursor: 'pointer' }}>Forgot?</span>}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="password"
                  required
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px 10px 42px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In & Verify' : 'Create Account'}</span>
              <ArrowRight size={18} />
            </button>

            {mode === 'login' && (
              <>
                <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'hsla(var(--hue-primary), 30%, 50%, 0.05)', border: '1px dashed var(--border-glass)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>🚀 Instant Demo Accounts:</div>
                  <div>• Master Admin: <code style={{ color: 'var(--color-primary)' }}>master@ecosphere.demo</code></div>
                  <div>• Org Admin: <code style={{ color: 'var(--color-primary)' }}>orgadmin@ecosphere.demo</code></div>
                  <div>• Dept Head: <code style={{ color: 'var(--color-primary)' }}>depthead@ecosphere.demo</code></div>
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>Any password works (`password123`). OTP demo code: `123456`.</div>
                </div>

                {onViewPublicPolicies && (
                  <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={onViewPublicPolicies}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}
                    >
                      View Public Policies & Governance (NGO/Public)
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'hsla(162, 75%, 40%, 0.15)', color: 'hsl(162, 75%, 40%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={32} />
              </div>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Multi-Factor Authentication</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Enter the 6-digit security verification code sent to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
            </p>

            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  width: '200px',
                  padding: '14px',
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '8px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  border: '2px solid var(--color-primary)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <CheckCircle2 size={18} />
              <span>Verify & Launch Platform</span>
            </button>

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('creds')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back to credentials
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
