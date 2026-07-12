import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { RoleType } from '../../types';

export interface RoleGateProps {
  roles?: RoleType[];
  requireScope?: { kind: 'region' | 'sector'; value: string };
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ roles, requireScope, fallback = null, children }) => {
  const { hasRole, hasScope } = useAuth();

  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) {
      return <>{fallback}</>;
    }
  }

  if (requireScope) {
    if (!hasScope(requireScope.kind, requireScope.value)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
