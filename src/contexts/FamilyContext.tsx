
"use client";
import type { UserProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface EnrichedContext {
    id: string;
    name: string;
    role?: FamilyRole;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentContext, setCurrentContextState] = useState<'my-space' | string>('my-space');
  const [availableContexts, setAvailableContextsState] = useState<EnrichedContext[]>([{ id: 'my-space', name: 'Meu Espaço' }]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const initialContexts = [{ id: 'my-space', name: 'Meu Espaço' }];
      
      const membershipsQuery = query(collection(db, 'familyMemberships'), where('userId', '==', user.uid));
      
      const unsubscribeMemberships = onSnapshot(membershipsQuery, async (snapshot) => {
        const memberships = snapshot.docs.map(doc => doc.data() as FamilyMembership);
        if (memberships.length === 0) {
            setAvailableContextsState(initialContexts);
            setIsLoading(false);
            return;
        }

        const familyIds = memberships.map(m => m.familyId);
        const familyRoles = new Map(memberships.map(m => [m.familyId, m.role]));

        const familiesQuery = query(collection(db, 'families'), where('__name__', 'in', familyIds));
        
        onSnapshot(familiesQuery, (familiesSnapshot) => {
            const familyContexts = familiesSnapshot.docs.map(doc => {
                const family = doc.data() as Family;
                return { 
                    id: doc.id, 
                    name: family.name,
                    role: familyRoles.get(doc.id)
                };
            });
            
            const allContexts = [...initialContexts, ...familyContexts];
            
            const uniqueContexts = allContexts.filter((context, index, self) =>
                index === self.findIndex((c) => (c.id === context.id))
            );
            
            setAvailableContextsState(uniqueContexts);

            const preferredContext = user.settings?.initialContext;
            if (preferredContext && uniqueContexts.some(c => c.id === preferredContext)) {
              setCurrentContextState(preferredContext);
            } else if (!uniqueContexts.some(c => c.id === currentContext)) {
              // If current context is no longer valid, reset to my-space
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

      return () => {
        unsubscribeMemberships();
      };

    } else {
      setCurrentContextState('my-space');
      setAvailableContextsState([{ id: 'my-space', name: 'Meu Espaço' }]);
      setIsLoading(false);
    }
  }, [user, currentContext]);

  const setCurrentContext = (context: 'my-space' | string) => {
    setCurrentContextState(context);
  };

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };

  return (
    <FamilyContext.Provider value={{ currentContext, setCurrentContext, availableContexts, setAvailableContexts, isLoading }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = (): FamilyContextType => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
