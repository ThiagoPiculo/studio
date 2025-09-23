
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
    // Wait until authentication is fully loaded before checking credentials
    if (authLoading) {
      return;
    }

    // If, after loading, the user is not an authenticated child, log them out.
    if (!isChildAuthenticated) {
      logout(); // This also clears child session data
      router.replace('/dashboard/child-login');
      return;
    }

    // If the authenticated child's profile is available but doesn't match the URL, redirect them.
    if (childProfile && childProfile.id !== childId) {
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
