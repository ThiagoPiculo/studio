
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import Loading from './loading';

export default function DashboardRedirectPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading } = useFamily();
    const router = useRouter();

    useEffect(() => {
        // Wait until both auth and family contexts are loaded
        if (authLoading || familyLoading) {
            return;
        }

        // If no user, the AuthProvider will handle the redirect.
        if (!user) {
            return;
        }

        const isNewUser = availableContexts.length <= 1 && (!availableContexts.find(c => c.id !== 'my-space'));
        const hasChildrenInMySpace = availableContexts.some(c => c.id === 'my-space'); // Simplified check

        // This condition is a guess, might need refinement based on how children are loaded.
        // The goal is to check if the user has *absolutely nothing* set up.
        // A better check might involve fetching children count if availableContexts is basic.
        if (isNewUser) {
             // A more robust check might be needed here, maybe a separate firestore field 'hasCompletedOnboarding'
             // For now, if only 'my-space' exists, we assume a new user.
             router.replace('/dashboard/assistente');
        } else {
            // For any existing user, go to the most useful page.
            router.replace('/dashboard/heroes');
        }

    }, [user, authLoading, familyLoading, availableContexts, router]);

    // Render a loading state while the redirection logic runs
    return <Loading />;
}
