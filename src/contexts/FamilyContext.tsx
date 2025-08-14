

"use client";
import type { UserProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
            if (currentContext !== 'my-space') {
              setCurrentContextState('my-space');
            }
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

            const preferredContextId = user.settings?.initialContext;

            // Only set a specific context if the user has explicitly chosen one (not 'default')
            if (preferredContextId && preferredContextId !== 'default' && allContexts.some(c => c.id === preferredContextId)) {
                if (currentContext !== preferredContextId) {
                    setCurrentContextState(preferredContextId);
                }
            } else if (!allContexts.some(c => c.id === currentContext)) {
                 // Fallback if current context is no longer valid
                setCurrentContextState('my-space');
            }
            
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
    }
    
    return () => {
        unsubscribeMemberships();
        unsubscribeFamilies();
      };
  }, [user, authLoading]);

  const setCurrentContext = (contextId: 'my-space' | string) => {
    setCurrentContextState(contextId);
  };

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };
  
  const currentRole = React.useMemo(() => {
    if (currentContext === 'my-space') return 'Personal';
    const context = availableContexts.find(c => c.id === currentContext)
    return context?.role || null
  }, [currentContext, availableContexts]);

  return (
    <FamilyContext.Provider value={{ currentContext, setCurrentContext, availableContexts, setAvailableContexts, isLoading, currentRole }}>
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
