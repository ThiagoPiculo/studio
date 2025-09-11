
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Suspense } from 'react';
import Loading from "./loading";
import SpaceSelector from "@/components/dashboard/SpaceSelector";
import { getChildProfilesByOwner, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';


export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading } = useFamily();
    const router = useRouter();

    const [decision, setDecision] = useState<'loading' | 'welcome' | 'heroes' | 'selector'>('loading');

    const checkUserStatus = useCallback(async () => {
        if (!user || availableContexts.length === 0) return;

        try {
            const childPromises = availableContexts.map(context =>
                context.id === 'my-space'
                    ? getChildProfilesByOwner(user.uid, true)
                    : getChildProfilesByFamily(context.id)
            );

            const allChildrenNested = await Promise.all(childPromises);
            const allChildren = allChildrenNested.flat();

            if (allChildren.length === 0 && availableContexts.length <= 1) {
                setDecision('welcome');
            } else if (allChildren.length > 0 && availableContexts.length <= 1) {
                setDecision('heroes');
            } else {
                setDecision('selector');
            }
        } catch (error) {
            console.error("Error deciding user path:", error);
            setDecision('selector'); // Fallback to selector on error
        }
    }, [user, availableContexts]);


    useEffect(() => {
        if (authLoading || familyLoading) {
            setDecision('loading');
            return;
        }

        if (!user) {
            router.replace('/auth/login');
            return;
        }
        
        checkUserStatus();

    }, [authLoading, familyLoading, user, router, checkUserStatus]);

    useEffect(() => {
        if (decision === 'welcome') {
            router.replace('/dashboard/welcome');
        } else if (decision === 'heroes') {
            router.replace('/dashboard/heroes');
        }
    }, [decision, router]);

    if (decision === 'loading' || decision === 'welcome' || decision === 'heroes') {
        return <Loading />;
    }

    return (
        <Suspense fallback={<Loading />}>
            <SpaceSelector />
        </Suspense>
    );
}
