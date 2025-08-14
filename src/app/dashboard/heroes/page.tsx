
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { useSearchParams } from 'next/navigation';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);
    const searchParams = useSearchParams();
    const childIdFromUrl = searchParams.get('childId');

    const fetchData = useCallback(async () => {
        if (!user) {
            setChildren([]);
            setMissions([]);
            return;
        }
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
        }
    }, [user, currentContext]);


    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
            fetchData();
        }
    }, [authLoading, isFamilyLoading, fetchData]);


    if (authLoading || isFamilyLoading || children === null || missions === null) {
        return <Loading />;
    }
    
    if (children.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false}
                hasRewards={false}
            />
        );
    }
    
    return <HeroesSummary children={children} missionInstances={missions} initialSelectedChildId={childIdFromUrl} />;
}


export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesPageContent />
        </Suspense>
    )
}
