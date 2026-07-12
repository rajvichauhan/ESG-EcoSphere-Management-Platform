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

  let badgeClass = 'badge badge-neutral';

  if (overdue) {
    badgeClass = 'badge badge-danger badge-pulse';
  } else if (type === 'severity') {
    if (norm === 'critical') badgeClass = 'badge badge-danger';
    else if (norm === 'high') badgeClass = 'badge badge-warning';
    else if (norm === 'medium') badgeClass = 'badge badge-info';
    else badgeClass = 'badge badge-neutral';
  } else if (type === 'approximation') {
    if (value === 'true' || value === 'Approx') badgeClass = 'badge badge-warning';
    else badgeClass = 'badge badge-success';
  } else {
    // Standard status -> color mapping (§7)
    if (['active', 'completed', 'approved', 'confirmed', 'current', 'on track', 'published', 'achieved', 'exact'].includes(norm)) {
      badgeClass = 'badge badge-success';
    } else if (['draft', 'pending', 'planned', 'joined', 'scheduled', 'invited'].includes(norm)) {
      badgeClass = 'badge badge-neutral';
    } else if (['under review', 'in progress', 'submitted', 'at risk'].includes(norm)) {
      badgeClass = 'badge badge-info';
    } else if (['rejected', 'cancelled', 'revoked', 'superseded', 'closed', 'archived', 'discontinued', 'missed', 'retired', 'suspended'].includes(norm)) {
      badgeClass = 'badge badge-danger';
    }
  }

  return (
    <span className={badgeClass} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
      {overdue && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />}
      {labelOverride || (overdue ? `OVERDUE (${norm})` : norm.toUpperCase())}
    </span>
  );
};
