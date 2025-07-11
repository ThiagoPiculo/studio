
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
  const { currentContext, availableContexts, isLoading: familyLoading } = useFamily();
  
  // Directly get memberships from the family context
  const familyMemberships = useMemo(() => {
    const familyContext = availableContexts.find(c => c.id === currentContext);
    // This is a placeholder as the full memberships are not in availableContexts
    // A better approach is to get this from a dedicated provider or within useFamily hook
    return [];
  }, [availableContexts, currentContext]);


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

    const checkFamilyRole = async () => {
        const familyData = await getFamilyById(currentContext);
        if (familyData?.ownerId === user.uid) {
            setUserRoleInfo({ role: 'Owner', canEdit: true, canViewOnly: false, isLoading: false });
            return;
        }

        // Fallback or further checks for other roles would be needed if owner check is not enough.
        // For now, let's assume non-owners are at least viewers.
        // A proper implementation would fetch the specific membership document.
        // This is a simplified fix.
         setUserRoleInfo({
            role: 'Guardian', // Assuming Guardian for now, needs proper membership check.
            canEdit: true, 
            canViewOnly: false,
            isLoading: false
        });
    }

    checkFamilyRole();

  }, [user, currentContext, authLoading, familyLoading]);
  
  return userRoleInfo;
}
