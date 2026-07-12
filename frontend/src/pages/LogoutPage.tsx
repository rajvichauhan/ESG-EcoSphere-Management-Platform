import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

interface LogoutPageProps {
  onRedirectToLanding: () => void;
}

export const LogoutPage: React.FC<LogoutPageProps> = ({ onRedirectToLanding }) => {
  const { logout } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (e) {
        console.error('Logout error:', e);
      } finally {
        // Allow a short delay to display the signing out message
        setTimeout(() => {
          onRedirectToLanding();
        }, 1200);
      }
    };
    performLogout();
  }, [logout, onRedirectToLanding]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '360px', width: '100%', textAlign: 'center', padding: '3rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'inline-flex', width: '48px', height: '48px', border: '1px solid var(--text-main)', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <LogOut size={20} />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
          Signing Out
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
          Clearing secure session tokens and auditing device logs. You will be redirected to the landing page shortly.
        </p>
      </div>
    </div>
  );
};
