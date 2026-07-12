import React from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onBack: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', padding: '2rem' }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '3rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'inline-flex', width: '56px', height: '56px', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <HelpCircle size={28} />
        </div>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
          Page Not Found
        </h1>
        
        <span className="text-mono-label" style={{ display: 'block', color: 'var(--accent-red)', marginBottom: '1rem' }}>
          Error Code: 404 / Route Invalid
        </span>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          The requested ledger entry or system module path is invalid or has been archived. Verify the destination and try again.
        </p>
        
        <button onClick={onBack} className="btn btn-primary" style={{ width: '100%' }}>
          <ArrowLeft size={16} /> Return to Security Console
        </button>
      </div>
    </div>
  );
};
