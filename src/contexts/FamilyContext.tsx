
"use client";
import type { UserProfile, ChildProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { convertTimestampsInObject } from '@/lib/utils';

interface EnrichedContext {
    id: string;
    name: string;
    role?: FamilyRole | 'Personal';
}

const FamilyContext = React.createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentContext, _setCurrentContext] = React.useState<'my-space' | string>('');
  const [selectedChildId, _setSelectedChildId] = React.useState<string | null>(null);
  const [availableContexts, setAvailableContextsState] = React.useState<EnrichedContext[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isContextSelected, setIsContextSelected] = useState(false);
  
  const [childrenInContext, setChildrenInContext] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  // Load from session storage on initial mount
  useEffect(() => {
    try {
      const storedContext = sessionStorage.getItem('currentContext');
      const storedChildId = sessionStorage.getItem('selectedChildId');
      if (storedContext) {
        _setCurrentContext(storedContext);
        setIsContextSelected(true);
      }
       if (storedChildId) {
        _setSelectedChildId(storedChildId);
      }
    } catch (e) {
      console.error("Could not access session storage:", e);
    }
  }, []);
  
  const setCurrentContext = useCallback((contextId: 'my-space' | string) => {
    _setCurrentContext(contextId);
    _setSelectedChildId(null); // Reset child when context changes
    if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('currentContext', contextId);
        sessionStorage.removeItem('selectedChildId'); // Clear child selection
    }
    setIsContextSelected(true);
  }, []);

  const setSelectedChildId = useCallback((childId: string | null) => {
    _setSelectedChildId(childId);
    if (childId) {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('selectedChildId', childId);
        }
    } else {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem('selectedChildId');
        }
    }
  }, []);


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
            if (!sessionStorage.getItem('currentContext')) {
                setCurrentContext('my-space');
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

            const storedContext = sessionStorage.getItem('currentContext');
            if (!storedContext || !allContexts.some(c => c.id === storedContext)) {
                 setCurrentContext('');
                 setIsContextSelected(false);
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
      setCurrentContext('');
      setAvailableContextsState([]);
      setIsLoading(false);
      setIsContextSelected(false);
    }
    
    return () => {
        unsubscribeMemberships();
        unsubscribeFamilies();
      };
  }, [user, authLoading, setCurrentContext]);

  // New listener for children in the current context
  useEffect(() => {
    if (!user || !currentContext) {
      setChildrenInContext([]);
      return;
    }
    setIsLoadingChildren(true);
    
    let q;
    if (currentContext === 'my-space') {
      q = query(collection(db, 'children'), where('ownerId', '==', user.uid), where('familyId', '==', null));
    } else {
      q = query(collection(db, 'children'), where('familyId', '==', currentContext));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const children = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
      setChildrenInContext(children.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoadingChildren(false);
    }, (error) => {
        console.error("Error fetching children for context:", error);
        setIsLoadingChildren(false);
    });

    return () => unsubscribe();
  }, [user, currentContext]);

  const setAvailableContexts = (contexts: EnrichedContext[]) => {
    setAvailableContextsState(contexts);
  };
  
  const currentRole = React.useMemo(() => {
    if (currentContext === 'my-space') return 'Personal';
    const context = availableContexts.find(c => c.id === currentContext)
    return context?.role || null
  }, [currentContext, availableContexts]);

  const value = {
    currentContext,
    setCurrentContext,
    availableContexts,
    setAvailableContexts,
    isLoading: isLoading || isLoadingChildren, // Combine loading states
    currentRole,
    isContextSelected,
    selectedChildId,
    setSelectedChildId,
    childrenInContext, // Expose children
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
