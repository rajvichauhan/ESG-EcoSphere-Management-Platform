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
  icon = <FolderOpen size={40} color="var(--color-primary)" />,
}) => {
  return (
    <div className="empty-state glass-card" style={{ padding: '48px 24px', textAlign: 'center', margin: '16px 0' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>{title}</h4>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px' }}>{description}</p>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
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
    <div className="error-state glass-panel" style={{ padding: '32px', textAlign: 'center', margin: '16px 0', borderColor: 'hsla(0, 80%, 55%, 0.3)' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
        <AlertCircle size={36} color="hsl(0, 80%, 55%)" />
      </div>
      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'hsl(0, 80%, 55%)', marginBottom: '8px' }}>Failed to load data</h4>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 16px', wordBreak: 'break-word' }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} />
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
  if (shape === 'tile') {
    return (
      <div className="skeleton-tile glass-card" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="skeleton-pulse" style={{ width: '40%', height: '16px', borderRadius: '4px' }} />
        <div className="skeleton-pulse" style={{ width: '60%', height: '32px', borderRadius: '6px' }} />
        <div className="skeleton-pulse" style={{ width: '30%', height: '14px', borderRadius: '4px' }} />
      </div>
    );
  }

  if (shape === 'chart') {
    return (
      <div className="skeleton-chart glass-card" style={{ height: '320px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '32px' }}>
        {[40, 65, 30, 85, 55, 90, 45, 75, 60, 80, 50, 95].map((h, i) => (
          <div key={i} className="skeleton-pulse" style={{ flexGrow: 1, height: `${h}%`, borderRadius: '4px 4px 0 0' }} />
        ))}
      </div>
    );
  }

  if (shape === 'table') {
    return (
      <div className="skeleton-table glass-card" style={{ padding: '20px' }}>
        <div className="skeleton-pulse" style={{ width: '100%', height: '36px', borderRadius: '6px', marginBottom: '16px' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="skeleton-pulse" style={{ width: '25%', height: '24px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ width: '35%', height: '24px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ width: '25%', height: '24px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ width: '15%', height: '24px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
  }

  return <div className="skeleton-pulse" style={{ width: '100%', height: '24px', borderRadius: '4px', margin: '8px 0' }} />;
};
