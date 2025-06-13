
"use client";
import type { UserProfile } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FamilyContextType, Family, FamilyMembership } from '@/lib/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentContext, setCurrentContextState] = useState<'my-space' | string>('my-space');
  const [availableContexts, setAvailableContextsState] = useState<{ id: string; name: string }[]>([{ id: 'my-space', name: 'Meu Espaço' }]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const initialContexts = [{ id: 'my-space', name: 'Meu Espaço' }];
      
      const ownedFamiliesQuery = query(collection(db, 'families'), where('ownerId', '==', user.uid));
      const unsubscribeOwned = onSnapshot(ownedFamiliesQuery, async (snapshot) => {
        const ownedFamilies = snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data() as Family).name }));
        
        const membershipsQuery = query(collection(db, 'familyMemberships'), where('userId', '==', user.uid));
        const membershipsSnapshot = await getDocs(membershipsQuery);
        const memberFamilyIds = membershipsSnapshot.docs.map(doc => (doc.data() as FamilyMembership).familyId);

        let collaboratorFamilies: {id: string, name: string}[] = [];
        if (memberFamilyIds.length > 0) {
            const familiesQuery = query(collection(db, 'families'), where('__name__', 'in', memberFamilyIds));
            const familiesSnapshot = await getDocs(familiesQuery);
            collaboratorFamilies = familiesSnapshot.docs.map(doc => ({ id: doc.id, name: (doc.data() as Family).name }));
        }
        
        const allContexts = [
            ...initialContexts, 
            ...ownedFamilies,
            ...collaboratorFamilies
        ];
        
        const uniqueContexts = allContexts.filter((context, index, self) =>
            index === self.findIndex((c) => (
                c.id === context.id
            ))
        );

        setAvailableContextsState(uniqueContexts);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching family contexts:", error);
        setAvailableContextsState(initialContexts); 
        setIsLoading(false);
      });

      return () => {
        unsubscribeOwned();
      };

    } else {
      setCurrentContextState('my-space');
      setAvailableContextsState([{ id: 'my-space', name: 'Meu Espaço' }]);
      setIsLoading(false);
    }
  }, [user]);

  const setCurrentContext = (context: 'my-space' | string) => {
    setCurrentContextState(context);
  };

  const setAvailableContexts = (contexts: { id: string; name: string }[]) => {
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
