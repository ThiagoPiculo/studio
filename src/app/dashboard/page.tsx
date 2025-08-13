// src/app/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import Loading from './loading';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { getChildProfilesForAttribution, getMissionTemplatesByOwnerOrFamily, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';

export default function DashboardRedirectPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading } = useFamily();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || familyLoading) {
            return;
        }

        if (!user) {
            router.replace('/auth/login');
            return;
        }

        const checkInitialState = async () => {
            const hasAlliances = availableContexts.some(c => c.id !== 'my-space');
            const children = await getChildProfilesForAttribution(user.uid, 'my-space');
            
            if (children.length === 0 && !hasAlliances) {
                // This is a new user, stay on a page that will show the GettingStartedGuide
                // But let's route to the main summary page, which handles this case.
                 router.replace('/dashboard/heroes');
            } else {
                const initialPage = user.settings?.initialPage || 'heroes';
                router.replace(`/dashboard/${initialPage}`);
            }
        };

        checkInitialState();

    }, [user, authLoading, familyLoading, availableContexts, router]);
    
    // Render a full-page loader while contexts are resolving and redirection is happening.
    return <Loading />;
}
