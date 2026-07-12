import React from 'react';

export interface StatusBadgeProps {
  value?: string;
  status?: string;
  type?: 'status' | 'severity' | 'approximation' | 'custom' | string;
  labelOverride?: string;
  overdue?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ value, status, type = 'status', labelOverride, overdue }) => {
  const val = value || status || '';
  const norm = val.toLowerCase().replace(/_/g, ' ');

  let badgeClass = 'badge';

  if (overdue) {
    badgeClass = 'badge badge-danger';
  } else if (type === 'severity') {
    if (norm === 'critical') badgeClass = 'badge badge-danger';
    else if (norm === 'high') badgeClass = 'badge badge-warning';
    else if (norm === 'medium') badgeClass = 'badge badge-info';
    else badgeClass = 'badge';
  } else if (type === 'approximation') {
    if (value === 'true' || value === 'Approx') badgeClass = 'badge badge-warning';
    else badgeClass = 'badge badge-success';
  } else {
    // Standard status -> color mapping
    if (['active', 'completed', 'approved', 'confirmed', 'current', 'on track', 'published', 'achieved', 'exact'].includes(norm)) {
      badgeClass = 'badge badge-success';
    } else if (['draft', 'pending', 'planned', 'joined', 'scheduled', 'invited'].includes(norm)) {
      badgeClass = 'badge';
    } else if (['under review', 'in progress', 'submitted', 'at risk'].includes(norm)) {
      badgeClass = 'badge badge-info';
    } else if (['rejected', 'cancelled', 'revoked', 'superseded', 'closed', 'archived', 'discontinued', 'missed', 'retired', 'suspended'].includes(norm)) {
      badgeClass = 'badge badge-danger';
    }
  }

  return (
    <span className={badgeClass} style={{ whiteSpace: 'nowrap' }}>
      <span className="badge-dot" style={{ display: 'inline-block' }} />
      <span style={{ fontSize: '10px' }}>{labelOverride || (overdue ? `OVERDUE (${norm})` : norm.toUpperCase())}</span>
    </span>
  );
};
