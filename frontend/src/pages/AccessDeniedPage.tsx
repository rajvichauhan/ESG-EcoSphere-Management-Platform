import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedPageProps {
  onBack: () => void;
  onGoHome: () => void;
  requiredRoles?: string[];
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ onBack, onGoHome, requiredRoles }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', width: '100%', padding: '3rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', width: '56px', height: '56px', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={28} />
          </div>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
          Access Denied
        </h1>

        <span className="text-mono-label" style={{ display: 'block', textAlign: 'center', color: 'var(--accent-red)', marginBottom: '1.5rem' }}>
          Security Clearance Check Failed
        </span>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem', textAlign: 'center' }}>
          Your authenticated account credentials do not hold the required security roles or department scopes necessary to view this system console.
          {requiredRoles && requiredRoles.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-main)', textAlign: 'left' }}>
              <strong>Required Roles:</strong> {requiredRoles.join(', ')}
            </div>
          )}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ flex: 1 }}>
            <ArrowLeft size={16} /> Go Back
          </button>
          <button onClick={onGoHome} className="btn btn-primary" style={{ flex: 1 }}>
            <Home size={16} /> Main Console
          </button>
        </div>
      </div>
    </div>
  );
};
