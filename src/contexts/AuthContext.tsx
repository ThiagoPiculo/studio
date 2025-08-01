
"use client";
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, ChildProfile, AuthContextType } from '@/lib/types';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
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
          async (docSnap) => { 
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              // Check if existing user is missing avatarUrl from Google login
              if (!userData.avatarUrl && firebaseUser.photoURL) {
                await updateDoc(userDocRef, { avatarUrl: firebaseUser.photoURL });
                setUser({ ...userData, avatarUrl: firebaseUser.photoURL });
              } else {
                setUser({ uid: docSnap.id, ...userData });
              }
              setIsChildAuthenticated(false);
              setChildProfile(null);
            } else {
              const tempUser: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName,
                  avatarUrl: firebaseUser.photoURL,
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
      const googleUser = result.user;

      const userDocRef = doc(db, 'users', googleUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const userProfile: UserProfile = {
          uid: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName,
          avatarUrl: googleUser.photoURL,
          createdAt: serverTimestamp() as any,
          settings: {
            initialPage: 'heroes',
            rewardMode: 'automatic',
          },
        };
        await setDoc(userDocRef, userProfile);
      } else {
        // If user exists but is missing avatar, update it.
        const userData = userDocSnap.data();
        if (!userData.avatarUrl && googleUser.photoURL) {
          await updateDoc(userDocRef, { avatarUrl: googleUser.photoURL });
        }
      }

    } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
           console.error("Error during Google sign-in:", error);
        }
        setLoading(false); 
        throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const setChildAuthenticatedState = (profile: ChildProfile) => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
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
