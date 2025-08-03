
"use client";

import { useMemo } from 'react';
import { useFamily } from '@/contexts/FamilyContext';
import type { FamilyRole } from '@/lib/types';

export type UserRoleInfo = {
  role: FamilyRole | 'Personal' | null;
  canEdit: boolean;
  canViewOnly: boolean;
  isLoading: boolean;
};

const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];

export function useUserRole(): UserRoleInfo {
  const { currentContext, currentRole, isLoading } = useFamily();
  
  const userRoleInfo = useMemo<UserRoleInfo>(() => {
    if (isLoading) {
      return { role: null, canEdit: false, canViewOnly: false, isLoading: true };
    }

    // This is the critical fix.
    // If the context is 'my-space', editing is ALWAYS allowed, regardless of roles in other families.
    if (currentContext === 'my-space') {
      return {
        role: 'Personal',
        canEdit: true,
        canViewOnly: false,
        isLoading: false,
      };
    }
    
    // Only if we are NOT in 'my-space', we check the role within the alliance.
    const canEdit = !!currentRole && editableRoles.includes(currentRole as FamilyRole);
    
    return {
      role: currentRole,
      canEdit: canEdit,
      canViewOnly: !canEdit,
      isLoading: false,
    };
    
  }, [currentContext, currentRole, isLoading]);
  
  return userRoleInfo;
}
