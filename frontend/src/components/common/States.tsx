import React from 'react';
import { FolderOpen, AlertCircle, RefreshCw } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description = 'No items found. Get started by adding your first record.',
  action,
  icon = <FolderOpen size={36} color="var(--text-muted)" />,
}) => {
  return (
    <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', margin: '16px 0', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>{title}</h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>{description}</p>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
          {action.icon}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="error-state" style={{ padding: '24px', textAlign: 'center', margin: '16px 0', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
        <AlertCircle size={28} color="var(--accent-red)" />
      </div>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '6px' }}>Failed to load data</h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 12px', wordBreak: 'break-word' }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
          <RefreshCw size={12} />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

export interface SkeletonProps {
  shape?: 'table' | 'tile' | 'card' | 'text' | 'chart';
  rows?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ shape = 'table', rows = 4 }) => {
  const pulseStyle: React.CSSProperties = {
    animation: 'skeleton-pulse-anim 1.5s ease-in-out infinite',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius)',
  };

  const styleTag = (
    <style>{`
      @keyframes skeleton-pulse-anim {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
      }
    `}</style>
  );

  if (shape === 'tile') {
    return (
      <div style={{ height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        {styleTag}
        <div style={{ ...pulseStyle, width: '40%', height: '14px' }} />
        <div style={{ ...pulseStyle, width: '60%', height: '24px' }} />
        <div style={{ ...pulseStyle, width: '30%', height: '12px' }} />
      </div>
    );
  }

  if (shape === 'chart') {
    return (
      <div style={{ height: '280px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '24px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        {styleTag}
        {[40, 65, 30, 85, 55, 90, 45, 75, 60, 80, 50, 95].map((h, i) => (
          <div key={i} style={{ ...pulseStyle, flexGrow: 1, height: `${h}%`, borderRadius: 'var(--radius) var(--radius) 0 0' }} />
        ))}
      </div>
    );
  }

  if (shape === 'table') {
    return (
      <div style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
        {styleTag}
        <div style={{ ...pulseStyle, width: '100%', height: '32px', marginBottom: '12px' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ ...pulseStyle, width: '25%', height: '20px' }} />
            <div style={{ ...pulseStyle, width: '35%', height: '20px' }} />
            <div style={{ ...pulseStyle, width: '25%', height: '20px' }} />
            <div style={{ ...pulseStyle, width: '15%', height: '20px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {styleTag}
      <div style={{ ...pulseStyle, width: '100%', height: '20px', margin: '6px 0' }} />
    </div>
  );
};
