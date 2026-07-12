import React from 'react';
import { TreePine, ArrowRight, Globe, Target, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToPublicPolicies: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToPublicPolicies,
}) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      {/* Editorial Header Nav */}
      <header style={{ borderBottom: '1px solid var(--border-subtle)', padding: '1.25rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', border: '1px solid var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TreePine size={18} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              EcoSphere
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={onNavigateToPublicPolicies} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              Public Policies
            </button>
            <button onClick={onNavigateToLogin} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flexGrow: 1, maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4rem' }}>
          <div style={{ maxWidth: '800px' }}>
            <span className="text-mono-label" style={{ display: 'block', marginBottom: '1rem' }}>
              Enterprise Sustainability Ledger
            </span>
            <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
              Corporate intelligence for the <i>decarbonized</i> future.
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2.5rem', maxWidth: '650px' }}>
              A unified platform for auditing greenhouse gas emissions, managing CSR initiatives, tracing product footprints, and governing organization compliance with absolute rigor.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={onNavigateToRegister} className="btn btn-primary" style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}>
                Create Platform Account <ArrowRight size={16} />
              </button>
              <button onClick={onNavigateToLogin} className="btn btn-secondary" style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}>
                Access Demo Environment
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Editorial border cells) */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
          <div style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '1.5rem' }}>
            <div style={{ width: '28px', height: '28px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
              <Globe size={14} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Carbon Calculator</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Double-entry ledger format logs Scope 1, 2, and 3 activities. Audit-ready calculations with verified emission factor tables.
            </p>
          </div>

          <div style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '1.5rem' }}>
            <div style={{ width: '28px', height: '28px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
              <Target size={14} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Governance & Audit</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Track policies, enforce department acknowledgements, and schedule structured audits with automated compliance ticketing.
            </p>
          </div>

          <div>
            <div style={{ width: '28px', height: '28px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
              <ShieldCheck size={14} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Gamified Engagement</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Empower employees to submit proofs of sustainability training, join carbon challenges, and unlock achievement rewards.
            </p>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem', backgroundColor: 'var(--bg-surface)', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} EcoSphere Corp. Built for strict regulatory ESG compliance.
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button onClick={onNavigateToPublicPolicies} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
              Public Disclosures
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              System Status: Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
