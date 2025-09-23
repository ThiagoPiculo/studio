
'use client';

import { ChildBottomNavbar } from '@/components/dashboard/child/ChildBottomNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loading from './loading';

export default function ChildDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const { childProfile, isChildAuthenticated, loading: authLoading, logout } = useAuth();

  const childId = params.childId as string;

  useEffect(() => {
    const postLoginRefresh = sessionStorage.getItem('postLoginRefresh');
    if (postLoginRefresh === 'true') {
        sessionStorage.removeItem('postLoginRefresh');
        window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!isChildAuthenticated || !childProfile)) {
        logout(); // Force logout for security if state is inconsistent
        router.replace('/dashboard/child-login');
    } else if (childProfile && childProfile.id !== childId) {
        // Logged in as a different child, redirect to their correct page
        router.replace(`/dashboard/child/${childProfile.id}`);
    }
  }, [childId, childProfile, isChildAuthenticated, authLoading, router, logout]);

  if (authLoading || !childProfile) {
    return <Loading />;
  }

  return (
    <>
      <main className="flex-1">{children}</main>
      <ChildBottomNavbar childId={childId} />
    </>
  );
}
