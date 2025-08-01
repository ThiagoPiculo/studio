
"use client";
import type { UserProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, from 'react';
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
  const { user } = useAuth();
  const [currentContext, setCurrentContextState] = React.useState<'my-space' | string>('my-space');
  const [availableContexts, setAvailableContextsState] = React.useState<EnrichedContext[]>([{ id: 'my-space', name: 'Meu Espaço', role: 'Personal' }]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      const initialContexts: EnrichedContext[] = [{ id: 'my-space', name: 'Meu Espaço', role: 'Personal' }];
      
      const membershipsQuery = query(collection(db, 'familyMemberships'), where('userId', '==', user.uid));
      
      const unsubscribeMemberships = onSnapshot(membershipsQuery, (snapshot) => {
        const memberships = snapshot.docs.map(doc => doc.data() as FamilyMembership);
        
        if (memberships.length === 0) {
            setAvailableContextsState(initialContexts);
            if (!initialContexts.some(c => c.id === currentContext)) {
              setCurrentContextState('my-space');
            }
            setIsLoading(false);
            return;
        }

        const familyIds = memberships.map(m => m.familyId);
        const familyRoles = new Map(memberships.map(m => [m.familyId, m.role]));

        const familiesQuery = query(collection(db, 'families'), where('__name__', 'in', familyIds));
        
        const unsubscribeFamilies = onSnapshot(familiesQuery, (familiesSnapshot) => {
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

            // Logic to set the current context safely
            const preferredContextId = user.settings?.initialContext || 'my-space';
            if (allContexts.some(c => c.id === preferredContextId)) {
                if (currentContext !== preferredContextId) {
                    setCurrentContextState(preferredContextId);
                }
            } else if (!allContexts.some(c => c.id === currentContext)) {
                // If the current context is no longer available (e.g., user left family), reset to a safe default
                setCurrentContextState('my-space');
            }
            
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching families:", error);
            setAvailableContextsState(initialContexts);
            setIsLoading(false);
        });
        
        return () => unsubscribeFamilies();

      }, (error) => {
        console.error("Error fetching family memberships:", error);
        setAvailableContextsState(initialContexts); 
        setIsLoading(false);
      });

      return () => {
        unsubscribeMemberships();
      };

    } else {
      setCurrentContextState('my-space');
      setAvailableContextsState([{ id: 'my-space', name: 'Meu Espaço', role: 'Personal' }]);
      setIsLoading(false);
    }
  }, [user]);

  const setCurrentContext = (contextId: 'my-space' | string) => {
    setCurrentContextState(contextId);
  };

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };
  
  const currentRole = React.useMemo(() => {
    return availableContexts.find(c => c.id === currentContext)?.role || null;
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
