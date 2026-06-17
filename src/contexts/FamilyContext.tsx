
"use client";
import type { UserProfile, ChildProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/config';
import { mapChildRow } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';

interface EnrichedContext {
    id: string;
    name: string;
    role?: FamilyRole | 'Personal';
}

const FamilyContext = React.createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentContext, _setCurrentContext] = React.useState<'my-space' | string>('my-space');
  const [selectedChildId, _setSelectedChildId] = React.useState<string | null>(null);
  const [availableContexts, setAvailableContextsState] = React.useState<EnrichedContext[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [childrenInContext, setChildrenInContext] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestination, setModalDestination] = useState<string | null>(null);
  const router = useRouter();

  const setCurrentContext = useCallback((contextId: 'my-space' | string) => {
    _setCurrentContext(contextId);
    _setSelectedChildId(null);
  }, []);

  const setSelectedChildId = useCallback((childId: string | null) => {
    _setSelectedChildId(childId);
  }, []);

  const selectHeroAndNavigate = useCallback((childId: string, contextId: string, path: string) => {
    if (currentContext !== contextId) {
        _setCurrentContext(contextId);
    }
    _setSelectedChildId(childId);
    router.push(path);
  }, [router, currentContext]);

  const openModal = useCallback((destination?: string) => {
    setModalDestination(destination || null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDestination(null);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCurrentContext('my-space');
      setAvailableContextsState([]);
      setIsLoading(false);
      return;
    }

    const initialContexts: EnrichedContext[] = [{ id: 'my-space', name: 'Cuidar Solo', role: 'Personal' }];

    const loadContexts = async () => {
      const { data: memberships, error } = await supabase
        .from('family_memberships')
        .select('family_id, role')
        .eq('user_id', user.uid);

      if (error || !memberships || memberships.length === 0) {
        setAvailableContextsState(initialContexts);
        setIsLoading(false);
        return;
      }

      const familyIds = memberships.map((m: any) => m.family_id);
      const roleMap = new Map(memberships.map((m: any) => [m.family_id, m.role]));

      const { data: families, error: famError } = await supabase
        .from('families')
        .select('id, name')
        .in('id', familyIds);

      if (famError || !families) {
        setAvailableContextsState(initialContexts);
        setIsLoading(false);
        return;
      }

      const familyContexts: EnrichedContext[] = families.map((f: any) => ({
        id: f.id,
        name: f.name,
        role: roleMap.get(f.id) as FamilyRole,
      }));

      const allContexts = [...initialContexts, ...familyContexts];
      setAvailableContextsState(allContexts);
      const isValid = allContexts.some(c => c.id === currentContext);
      if (!isValid) _setCurrentContext('my-space');
      setIsLoading(false);
    };

    loadContexts();

    const channel = supabase
      .channel(`memberships:${user.uid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'family_memberships',
        filter: `user_id=eq.${user.uid}`,
      }, () => { loadContexts(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, currentContext, setCurrentContext]);

  useEffect(() => {
    if (authLoading || !user) {
      setChildrenInContext([]);
      setIsLoadingChildren(false);
      return;
    }

    setIsLoadingChildren(true);

    const loadChildren = async () => {
      let query = supabase.from('child_profiles').select('*');
      if (currentContext === 'my-space') {
        query = query.eq('owner_id', user.uid).is('family_id', null);
      } else {
        query = query.eq('family_id', currentContext);
      }

      const { data, error } = await query;
      if (error || !data) {
        setChildrenInContext([]);
      } else {
        setChildrenInContext(data.map(mapChildRow).sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsLoadingChildren(false);
    };

    loadChildren();

    const filter = currentContext === 'my-space'
      ? `owner_id=eq.${user.uid}`
      : `family_id=eq.${currentContext}`;

    const channel = supabase
      .channel(`children:${currentContext}:${user.uid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'child_profiles',
        filter,
      }, () => { loadChildren(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, currentContext]);

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };

  const currentRole = React.useMemo(() => {
    if (currentContext === 'my-space') return 'Personal';
    const context = availableContexts.find(c => c.id === currentContext);
    return context?.role || null;
  }, [currentContext, availableContexts]);

  const value = {
    currentContext,
    setCurrentContext,
    availableContexts,
    setAvailableContexts,
    isLoading: isLoading || isLoadingChildren || authLoading,
    currentRole,
    selectedChildId,
    setSelectedChildId,
    childrenInContext,
    isModalOpen,
    openModal,
    closeModal,
    selectHeroAndNavigate,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = (): FamilyContextType => {
  const context = React.useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
