
"use client";

import { useMemo } from 'react';
import { useFamily } from '@/contexts/FamilyContext';
import type { FamilyRole } from '@/lib/types';

export function useUserRole() {
  const { currentContext, currentRole, isLoading } = useFamily();

  const canEdit = useMemo(() => {
    if (isLoading) return false; 
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole, isLoading]);

  return { canEdit, isLoading, role: currentRole };
}
