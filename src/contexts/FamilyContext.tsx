
"use client";
import type { UserProfile, ChildProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { FamilyContextType, Family, FamilyMembership, FamilyRole } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { convertTimestampsInObject } from '@/lib/utils';

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

  // State for the global modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestination, setModalDestination] = useState<string | null>(null);
  const router = useRouter();


  const setCurrentContext = useCallback((contextId: 'my-space' | string) => {
    _setCurrentContext(contextId);
    _setSelectedChildId(null); // Reset child when context changes
  }, []);

  const setSelectedChildId = useCallback((childId: string | null) => {
    _setSelectedChildId(childId);
  }, []);

  const selectHeroAndNavigate = useCallback((childId: string, contextId: string, path: string) => {
    _setSelectedChildId(childId);
    _setCurrentContext(contextId);
    router.push(path);
  }, [router]);
  
  // Navigate to destination after a child is selected from the modal
  useEffect(() => {
    if (selectedChildId && modalDestination) {
      router.push(modalDestination);
      setModalDestination(null); // Reset destination
    }
  }, [selectedChildId, modalDestination, router]);
  
  const openModal = useCallback((destination?: string) => {
    setModalDestination(destination || null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Do not clear modalDestination here, it might be needed for navigation
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
        
        const processContexts = (familyContexts: EnrichedContext[]) => {
            const allContexts = [...initialContexts, ...familyContexts];
            setAvailableContextsState(allContexts);

            const isValidCurrentContext = allContexts.some(c => c.id === currentContext);
            if (!isValidCurrentContext) {
                 _setCurrentContext('my-space');
            }
            
            setIsLoading(false);
        };

        if (memberships.length === 0) {
            processContexts([]);
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
            processContexts(familyContexts);

        }, (error) => {
            console.error("Error fetching families:", error);
            processContexts([]);
        });
        
      }, (error) => {
        console.error("Error fetching family memberships:", error);
        setAvailableContextsState(initialContexts); 
        setIsLoading(false);
      });
      
    } else { // No user
      setCurrentContext('my-space');
      setAvailableContextsState([]);
      setIsLoading(false);
    }
    
    return () => {
        unsubscribeMemberships();
        unsubscribeFamilies();
      };
  }, [user, authLoading, currentContext, setCurrentContext]);

  // New listener for children in the current context
  useEffect(() => {
    if (authLoading || !currentContext) {
      setChildrenInContext([]);
      setIsLoadingChildren(false);
      return;
    }
    
    if (!user) {
       setChildrenInContext([]);
       setIsLoadingChildren(false);
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
        setChildrenInContext([]);
        setIsLoadingChildren(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, currentContext]);

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
    isLoading: isLoading || isLoadingChildren || authLoading, // Combine loading states
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
