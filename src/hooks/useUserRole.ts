
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { FamilyRole } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export type UserRoleInfo = {
  role: FamilyRole | 'Personal' | null;
  canEdit: boolean;
  canViewOnly: boolean;
  isLoading: boolean;
};

const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];

export function useUserRole(): UserRoleInfo {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, isLoading: familyLoading } = useFamily();
  
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
      setUserRoleInfo(prev => ({ ...prev, isLoading: true }));
      try {
        const familyMembershipRef = doc(db, 'familyMemberships', `${user.uid}_${currentContext}`);
        const membershipSnap = await getDoc(familyMembershipRef);
        
        if (membershipSnap.exists()) {
          const role = membershipSnap.data().role as FamilyRole;
          setUserRoleInfo({
            role: role,
            canEdit: editableRoles.includes(role),
            canViewOnly: !editableRoles.includes(role),
            isLoading: false
          });
        } else {
          // This case could happen if memberships are created differently or there's a data inconsistency.
          // Fallback to a safe default (view-only) for any family context where membership is not found.
          console.warn(`Membership document not found for user ${user.uid} in family ${currentContext}. Defaulting to view-only.`);
          setUserRoleInfo({ role: null, canEdit: false, canViewOnly: true, isLoading: false });
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRoleInfo({ role: null, canEdit: false, canViewOnly: true, isLoading: false });
      }
    };

    checkFamilyRole();

  }, [user, currentContext, authLoading, familyLoading]);
  
  return userRoleInfo;
}
