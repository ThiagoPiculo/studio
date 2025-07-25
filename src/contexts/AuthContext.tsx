
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
  const [profileUnsubscribe, setProfileUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        setProfileUnsubscribe(null);
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const newProfileUnsubscribe = onSnapshot(userDocRef,
          async (docSnap) => { // Make this async to handle profile creation
            if (docSnap.exists()) {
              setUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
              setIsChildAuthenticated(false);
              setChildProfile(null);
            } else {
              // This case can happen right after account creation or if the doc doesn't exist.
              // We create a temporary user object from the auth data.
              // The onSnapshot will eventually pick up the full profile once it's created.
              const tempUser: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName,
                  createdAt: firebaseUser.metadata.creationTime ? Timestamp.fromDate(new Date(firebaseUser.metadata.creationTime)) : serverTimestamp() as any,
              };
              setUser(tempUser);
              setIsChildAuthenticated(false);
              setChildProfile(null);
            }
             setLoading(false);
          },
          (error) => {
            console.error("Error listening to user profile:", error);
            setUser(null);
            setLoading(false);
          }
        );
        setProfileUnsubscribe(() => newProfileUnsubscribe);
      } else {
        // No Firebase user
        setUser(null);
        setChildProfile(null);
        setIsChildAuthenticated(false);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  // Deliberately empty dependency array to run only on mount and unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and loading state
      // router.push('/dashboard'); // Let onAuthStateChanged and page logic handle redirects
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setLoading(false); // Ensure loading is false on error
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null. The useEffect in DashboardLayout
      // will then redirect to /auth/login.
      router.push('/auth/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const setChildAuthenticatedState = (profile: ChildProfile) => {
    if (profileUnsubscribe) {
      profileUnsubscribe(); // Unsubscribe from any admin profile listener
      setProfileUnsubscribe(null);
    }
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
