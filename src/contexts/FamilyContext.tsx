

"use client";
import type { UserProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface EnrichedContext {
    id: string;
    name: string;
    role?: FamilyRole | 'Personal';
}

const FamilyContext = React.createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentContext, setCurrentContextState] = React.useState<'my-space' | string>('my-space');
  const [availableContexts, setAvailableContextsState] = React.useState<EnrichedContext[]>([{ id: 'my-space', name: 'Cuidar Solo', role: 'Personal' }]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isContextSelected, setIsContextSelected] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    let unsubscribeMemberships: () => void = () => {};
    let unsubscribeFamilies: () => void = () => {};

    if (user) {
      setIsLoading(true);
      const initialContexts: EnrichedContext[] = [{ id: 'my-space', name: 'Cuidar Solo', role: 'Personal' }];
      
      const membershipsQuery = query(collection(db, 'familyMemberships'), where('userId', '==', user.uid));
      
      unsubscribeMemberships = onSnapshot(membershipsQuery, (snapshot) => {
        const memberships = snapshot.docs.map(doc => doc.data() as FamilyMembership);
        
        if (memberships.length === 0) {
            setAvailableContextsState(initialContexts);
            setCurrentContextState('my-space');
            setIsContextSelected(true); // Only one context, so it's selected by default
            setIsLoading(false);
            return;
        }

        const familyIds = memberships.map(m => m.familyId);
        const familyRoles = new Map(memberships.map(m => [m.familyId, m.role]));

        const familiesQuery = query(collection(db, 'families'), where('__name__', 'in', familyIds));
        
        unsubscribeFamilies = onSnapshot(familiesQuery, (familiesSnapshot) => {
            const familyContexts = familiesSnapshot.docs.map(doc => {
                const family = doc.data() as Family;
                return { 
                    id: doc.id, 
                    name: family.name,
                    role: familyRoles.get(doc.id)
                };
            });
            
            const allContexts = [...initialContexts, ...familyContexts];
            setAvailableContextsState(allContexts);

            const lastContext = localStorage.getItem('lastContextId');
            const preferredContextId = user.settings?.initialContext;

            let newContext = 'my-space'; // Default fallback
            
            if (allContexts.length === 1) {
                newContext = allContexts[0].id;
                setIsContextSelected(true);
            } else if (lastContext && allContexts.some(c => c.id === lastContext)) {
                newContext = lastContext;
                setIsContextSelected(true);
            } else if (preferredContextId && preferredContextId !== 'default' && allContexts.some(c => c.id === preferredContextId)) {
                newContext = preferredContextId;
                setIsContextSelected(true);
            } else {
                 // User has multiple contexts but no preference or last used, force selection
                setIsContextSelected(false);
                 // If the current path is not the dashboard, and a choice is needed, redirect.
                if (pathname !== '/dashboard' && !pathname.startsWith('/dashboard/settings') && !pathname.startsWith('/dashboard/profile')) {
                    router.replace('/dashboard');
                }
            }
            
            setCurrentContextState(newContext);
            setIsLoading(false);

        }, (error) => {
            console.error("Error fetching families:", error);
            setAvailableContextsState(initialContexts);
            setIsLoading(false);
        });
        
      }, (error) => {
        console.error("Error fetching family memberships:", error);
        setAvailableContextsState(initialContexts); 
        setIsLoading(false);
      });
      
    } else { // No user
      setCurrentContextState('my-space');
      setAvailableContextsState([{ id: 'my-space', name: 'Cuidar Solo', role: 'Personal' }]);
      setIsLoading(false);
      setIsContextSelected(false);
    }
    
    return () => {
        unsubscribeMemberships();
        unsubscribeFamilies();
      };
  }, [user, authLoading, router, pathname]);

  const setCurrentContext = useCallback((contextId: 'my-space' | string) => {
    setCurrentContextState(contextId);
    setIsContextSelected(true);
    localStorage.setItem('lastContextId', contextId);
  }, []);

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };
  
  const currentRole = React.useMemo(() => {
    if (currentContext === 'my-space') return 'Personal';
    const context = availableContexts.find(c => c.id === currentContext)
    return context?.role || null
  }, [currentContext, availableContexts]);

  return (
    <FamilyContext.Provider value={{ currentContext, setCurrentContext, availableContexts, setAvailableContexts, isLoading, currentRole, isContextSelected }}>
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
