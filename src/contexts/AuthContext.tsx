

"use client";
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, ChildProfile, AuthContextType } from '@/lib/types';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const convertTimestampsInObject = (obj: any): any => {
    if (!obj) return obj;
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value instanceof Timestamp) {
                newObj[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                newObj[key] = convertTimestampsInObject(value);
            } else {
                newObj[key] = value;
            }
        }
    }
    return newObj;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [isChildAuthenticated, setIsChildAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
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
              const userData = convertTimestampsInObject(docSnap.data()) as UserProfile;
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
              const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).toISOString() : new Date().toISOString();
              const tempUser: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName,
                  avatarUrl: firebaseUser.photoURL,
                  createdAt: creationTime as any, // Treat as string
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

        // If no user and not on a public page, redirect to login
        const publicPaths = ['/', '/auth/login', '/auth/register', '/child-login'];
        if (!publicPaths.includes(pathname)) {
            router.replace('/auth/login');
        }
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
        const userProfile: Omit<UserProfile, 'createdAt'> & { createdAt: any } = {
          uid: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName,
          avatarUrl: googleUser.photoURL,
          createdAt: serverTimestamp(),
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
      // The onAuthStateChanged listener will handle setting user to null and the redirect.
      // Explicitly push to ensure the user lands on the homepage.
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const setChildAuthenticatedState = (profile: ChildProfile) => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
      setProfileUnsubscribe(null);
    }
    setChildProfile(convertTimestampsInObject(profile));
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
