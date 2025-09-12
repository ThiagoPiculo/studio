"use client";
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Loading from './loading';

// Este layout de grupo serve para proteger as rotas filhas sob
// uma convenção de organização, garantindo que apenas crianças autenticadas acessem.
export default function ChildRouteGroupLayout({ children }: { children: ReactNode }) {
  const { isChildAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !isChildAuthenticated && pathname !== '/dashboard/child-login') {
      router.replace('/dashboard/child-login');
    }
  }, [isChildAuthenticated, authLoading, router, pathname]);

  if (authLoading) {
    return <Loading />;
  }
  
  return <>{children}</>;
}
