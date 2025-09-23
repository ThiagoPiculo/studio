
"use client";
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ReactNode } from 'react';
import React from 'react';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, ChildProfile, AuthContextType } from '@/lib/types';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { populateInitialRewardTemplates } from '@/lib/firebase/firestore';

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

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const getInitialChildState = (): { profile: ChildProfile | null; isAuthenticated: boolean } => {
    if (typeof window === 'undefined') {
        return { profile: null, isAuthenticated: false };
    }
    try {
        const storedChildProfile = sessionStorage.getItem('childProfile');
        if (storedChildProfile) {
            const profile = JSON.parse(storedChildProfile);
            return { profile, isAuthenticated: true };
        }
    } catch (e) {
        console.error("Failed to parse child profile from session storage:", e);
    }
    return { profile: null, isAuthenticated: false };
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [childProfile, setChildProfile] = React.useState<ChildProfile | null>(() => getInitialChildState().profile);
  const [isChildAuthenticated, setIsChildAuthenticated] = React.useState<boolean>(() => getInitialChildState().isAuthenticated);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [profileUnsubscribe, setProfileUnsubscribe] = React.useState<(() => void) | null>(null);

  React.useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        setProfileUnsubscribe(null);
      }

      if (firebaseUser) {
        // Handle post-login refresh for admin/parent user
        const postLoginRefresh = sessionStorage.getItem('postLoginRefresh');
        if (postLoginRefresh === 'true') {
            sessionStorage.removeItem('postLoginRefresh');
            // Use a short delay to allow login state to settle before refresh
            setTimeout(() => {
                router.replace('/dashboard?initial_load=true');
            }, 100);
            return; // Prevent further execution until after refresh
        }
        
        setLoading(true);
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
            } else {
              // This case might happen if a user was created but firestore doc failed.
              // The `loginWithGoogle` function handles creation, this is a fallback.
              const newUserProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                avatarUrl: firebaseUser.photoURL,
                createdAt: firebaseUser.metadata.creationTime ? (new Date(firebaseUser.metadata.creationTime).toISOString() as any) : (new Date().toISOString() as any),
              };
              setUser(newUserProfile);
            }
            
            // This is a parent/admin login, so clear any child state
            setIsChildAuthenticated(false);
            setChildProfile(null);
            sessionStorage.removeItem('childProfile');

            // Run the sync function for the user
            await populateInitialRewardTemplates(firebaseUser.uid, null);
            setLoading(false);
          },
          (error) => {
            console.error("Error listening to user profile:", error);
            setUser(null);
            setLoading(false);
          }
        );
        setProfileUnsubscribe(() => newProfileUnsubscribe);
      } else { // No Firebase user (could be logged out or a child user)
        const childState = getInitialChildState();
        if (childState.isAuthenticated) {
            setChildProfile(childState.profile);
            setIsChildAuthenticated(true);
            setUser(null);
        } else {
            // Logged out state for everyone
            setChildProfile(null);
            setIsChildAuthenticated(false);
            setUser(null);
        }

        setLoading(false);
        
        const isChildDashboard = pathname.startsWith('/dashboard/child/');
        const isChildLogin = pathname.startsWith('/dashboard/child-login');
        const isPublicAuthPath = pathname.startsWith('/auth/');
        const isHomePage = pathname === '/';
        const isAllowedPublic = isPublicAuthPath || isHomePage || isChildLogin;

        if (!user && !isChildAuthenticated && !isAllowedPublic && !isChildDashboard) {
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
            initialPage: 'dashboard',
            rewardMode: 'automatic',
          },
        };
        await setDoc(userDocRef, userProfile);
        await populateInitialRewardTemplates(googleUser.uid, null);
      } else {
        // If user exists but is missing avatar, update it.
        const userData = userDocSnap.data();
        if (!userData.avatarUrl && googleUser.photoURL) {
          await updateDoc(userDocRef, { avatarUrl: googleUser.photoURL });
        }
        await populateInitialRewardTemplates(googleUser.uid, null);
      }
      sessionStorage.setItem('postLoginRefresh', 'true');

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
      await signOut(auth); // This will trigger onAuthStateChanged
      
      // Clear all our custom session states regardless of user type
      sessionStorage.removeItem('childProfile');
      sessionStorage.removeItem('currentContext');
      sessionStorage.removeItem('selectedChildId');
      sessionStorage.removeItem('postLoginRefresh');
      
      // Manually update state to reflect logout immediately
      setUser(null);
      setChildProfile(null);
      setIsChildAuthenticated(false);
      
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
    const safeProfile = convertTimestampsInObject(profile);
    
    // Explicitly set parent user to null
    setUser(null); 

    setChildProfile(safeProfile);
    setIsChildAuthenticated(true);
    sessionStorage.setItem('childProfile', JSON.stringify(safeProfile));
    setLoading(false);
  };


  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, isChildAuthenticated, childProfile, setChildAuthenticatedState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
