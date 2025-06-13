
"use client";
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, ChildProfile, AuthContextType } from '@/lib/types';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [isChildAuthenticated, setIsChildAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userProfileData = userDocSnap.data() as UserProfile;
          setUser(userProfileData);
          setIsChildAuthenticated(false);
          setChildProfile(null);
          
          const unsubProfile = onSnapshot(userDocRef, (doc) => {
            setUser(doc.data() as UserProfile);
          });
          return () => unsubProfile();

        } else {
          if (firebaseUser.providerData.some(p => p.providerId === GoogleAuthProvider.PROVIDER_ID) && !userDocSnap.exists()) {
            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              createdAt: serverTimestamp() as any, 
            };
            await setDoc(userDocRef, newUserProfile);
            setUser(newUserProfile);
          }
        }
      } else {
        setUser(null);
        setChildProfile(null);
        setIsChildAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const newUserProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          createdAt: serverTimestamp() as any,
        };
        await setDoc(userDocRef, newUserProfile);
        setUser(newUserProfile);
      } else {
         setUser(userDocSnap.data() as UserProfile);
      }
      setIsChildAuthenticated(false);
      setChildProfile(null);
      router.push('/dashboard');
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setChildProfile(null);
      setIsChildAuthenticated(false);
      router.push('/auth/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const setChildAuthenticatedState = (profile: ChildProfile) => {
    setChildProfile(profile);
    setUser(null); 
    setIsChildAuthenticated(true);
    setLoading(false);
  };


  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, isChildAuthenticated, childProfile, setChildAuthenticatedState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
