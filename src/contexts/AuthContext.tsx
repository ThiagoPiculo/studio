"use client";

import type { ReactNode } from 'react';
import React from 'react';
import { supabase } from '@/lib/supabase/config';
import type { UserProfile, ChildProfile, AuthContextType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getUserProfile, populateInitialRewardTemplates } from '@/lib/supabase/db';

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const getInitialChildState = (): { profile: ChildProfile | null; isAuthenticated: boolean } => {
  if (typeof window === 'undefined') return { profile: null, isAuthenticated: false };
  try {
    const stored = sessionStorage.getItem('childProfile');
    if (stored) return { profile: JSON.parse(stored), isAuthenticated: true };
  } catch {}
  return { profile: null, isAuthenticated: false };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [childProfile, setChildProfile] = React.useState<ChildProfile | null>(() => getInitialChildState().profile);
  const [isChildAuthenticated, setIsChildAuthenticated] = React.useState<boolean>(() => getInitialChildState().isAuthenticated);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
        } else {
          const newProfile: UserProfile = {
            uid: session.user.id,
            email: session.user.email ?? null,
            name: session.user.user_metadata?.full_name ?? null,
            avatarUrl: session.user.user_metadata?.avatar_url ?? null,
            createdAt: session.user.created_at as any,
            settings: { rewardMode: 'automatic' },
          };
          setUser(newProfile);
          await populateInitialRewardTemplates(session.user.id, null);
        }
        setIsChildAuthenticated(false);
        setChildProfile(null);
        sessionStorage.removeItem('childProfile');
      } else {
        const childState = getInitialChildState();
        if (childState.isAuthenticated) {
          setChildProfile(childState.profile);
          setIsChildAuthenticated(true);
          setUser(null);
        } else {
          setUser(null);
          setChildProfile(null);
          setIsChildAuthenticated(false);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) { setLoading(false); throw error; }
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem('childProfile');
      setUser(null);
      setChildProfile(null);
      setIsChildAuthenticated(false);
      router.push('/');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const setChildAuthenticatedState = (profile: ChildProfile) => {
    setUser(null);
    setChildProfile(profile);
    setIsChildAuthenticated(true);
    sessionStorage.setItem('childProfile', JSON.stringify(profile));
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
