
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { loading: authLoading } = useAuth();
  const { currentRole, isLoading: familyLoading } = useFamily();
  
  const isLoading = authLoading || familyLoading;

  const userRoleInfo = useMemo<UserRoleInfo>(() => {
    if (isLoading) {
      return { role: null, canEdit: false, canViewOnly: false, isLoading: true };
    }

    if (!currentRole) {
      return { role: null, canEdit: false, canViewOnly: false, isLoading: false };
    }

    const canEdit = currentRole === 'Personal' || editableRoles.includes(currentRole as FamilyRole);
    
    return {
      role: currentRole,
      canEdit: canEdit,
      canViewOnly: !canEdit,
      isLoading: false,
    };
    
  }, [currentRole, isLoading]);
  
  return userRoleInfo;
}
