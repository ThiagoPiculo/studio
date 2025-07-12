
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

    // Explicitly check for 'my-space' first.
    if (currentContext === 'my-space') {
      return {
        role: 'Personal',
        canEdit: true,
        canViewOnly: false,
        isLoading: false,
      };
    }
    
    // If not in 'my-space', we are in a family context.
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
