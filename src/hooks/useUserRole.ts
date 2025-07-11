
import { useState, useEffect } from 'react';
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
  
  const [userRoleInfo, setUserRoleInfo] = useState<UserRoleInfo>({
    role: null,
    canEdit: false,
    canViewOnly: false,
    isLoading: true,
  });

  useEffect(() => {
    const isLoading = authLoading || familyLoading;
    if (isLoading) {
      setUserRoleInfo({ role: null, canEdit: false, canViewOnly: false, isLoading: true });
      return;
    }

    if (!currentRole) {
      setUserRoleInfo({ role: null, canEdit: false, canViewOnly: false, isLoading: false });
      return;
    }

    const canEdit = currentRole === 'Personal' || editableRoles.includes(currentRole as FamilyRole);
    
    setUserRoleInfo({
      role: currentRole,
      canEdit: canEdit,
      canViewOnly: !canEdit,
      isLoading: false,
    });
    
  }, [currentRole, authLoading, familyLoading]);
  
  return userRoleInfo;
}
