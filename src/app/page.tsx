
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isChildAuthenticated, childProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else if (isChildAuthenticated && childProfile) {
        router.replace(`/dashboard/child/${childProfile.id}`); 
      }
      else {
        router.replace('/auth/login');
      }
    }
  }, [user, loading, isChildAuthenticated, childProfile, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Carregando MiniHeroes...</p>
    </div>
  );
}
