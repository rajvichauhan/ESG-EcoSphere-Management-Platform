import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, footer, maxWidth = '600px' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 id="modal-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, fontSize: '0.875rem' }}>
          {children}
        </div>

        {footer && (
          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface DrawerProps {
  open: boolean;
  title: string;
  side?: 'left' | 'right';
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ open, title, side = 'right', onClose, children, width = '520px' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1050,
      }}
    >
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          [side]: 0,
          width: '100%',
          maxWidth: width,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: side === 'right' ? '1px solid var(--border)' : 'none',
          borderRight: side === 'left' ? '1px solid var(--border)' : 'none',
          borderRadius: 0,
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          className="drawer-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, fontSize: '0.875rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
