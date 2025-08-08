
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Don't fetch if the user or context is not ready yet.
        if (authLoading || isFamilyLoading || !user) {
            // If the contexts are ready but there's no user, it means they are logged out.
            if (!authLoading && !isFamilyLoading && !user) {
                setIsLoading(false);
                setChildren([]);
                setMissions([]);
            }
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [childData, missionData] = await Promise.all([
                    getChildProfilesForAttribution(user.uid, currentContext),
                    getMissionInstancesForContext(user.uid, currentContext)
                ]);
                setChildren(childData);
                setMissions(missionData);
            } catch (error) {
                console.error("Error fetching heroes data:", error);
                setChildren([]);
                setMissions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, currentContext, authLoading, isFamilyLoading]);


    if (isLoading || authLoading || isFamilyLoading) {
        return <Loading />;
    }
    
    // After loading, if there are no children, show the guide.
    if (!children || children.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false}
                hasRewards={false}
            />
        );
    }
    
    // Ensure missions is not null before rendering summary
    return <HeroesSummary children={children} missionInstances={missions || []} />;
}


export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesPageContent />
        </Suspense>
    )
}
