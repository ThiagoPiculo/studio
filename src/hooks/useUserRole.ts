
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { FamilyRole } from '@/lib/types';
import { getFamilyById } from '@/lib/firebase/firestore';

export type UserRoleInfo = {
  role: FamilyRole | 'Personal' | null;
  canEdit: boolean;
  canViewOnly: boolean;
  isLoading: boolean;
};

const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];

export function useUserRole(): UserRoleInfo {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, familyMemberships, isLoading: familyLoading } = useFamily();
  
  const [userRoleInfo, setUserRoleInfo] = useState<UserRoleInfo>({
    role: null,
    canEdit: false,
    canViewOnly: false,
    isLoading: true,
  });

  useEffect(() => {
    if (authLoading || familyLoading) {
      setUserRoleInfo({ role: null, canEdit: false, canViewOnly: false, isLoading: true });
      return;
    }

    if (!user) {
        setUserRoleInfo({ role: null, canEdit: false, canViewOnly: false, isLoading: false });
        return;
    }

    if (currentContext === 'my-space') {
      setUserRoleInfo({
        role: 'Personal',
        canEdit: true,
        canViewOnly: false,
        isLoading: false,
      });
      return;
    }
    
    // Safety check for familyMemberships array
    const membership = familyMemberships && Array.isArray(familyMemberships)
      ? familyMemberships.find(m => m.userId === user.uid && m.familyId === currentContext)
      : undefined;
    
    if (membership) {
        const userRole = membership.role;
        const canEdit = editableRoles.includes(userRole);
        setUserRoleInfo({
            role: userRole,
            canEdit: canEdit,
            canViewOnly: !canEdit,
            isLoading: false,
        });
    } else {
        // This case might happen during context transitions or if data is inconsistent.
        // Default to a safe (read-only) state for family contexts if no membership is found.
        setUserRoleInfo({
            role: null,
            canEdit: false,
            canViewOnly: true,
            isLoading: false
        });
    }

  }, [user, currentContext, familyMemberships, authLoading, familyLoading]);
  
  return userRoleInfo;
}
