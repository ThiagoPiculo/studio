"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { useRouter } from 'next/navigation';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);
    const [rewards, setRewards] = useState<RewardTemplate[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        if (!user) {
            setChildren([]);
            setMissions([]);
            setRewards([]);
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
            const [childData, missionData, rewardData] = await Promise.all([
                getChildProfilesForAttribution(user.uid, currentContext),
                getMissionInstancesForContext(user.uid, currentContext),
                getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
            ]);
            
            if (childData.length === 0 && (!familyIdToQuery || familyIdToQuery === null)) {
                router.push('/dashboard/novo-heroi');
                return;
            }

            setChildren(childData);
            setMissions(missionData);
            setRewards(rewardData);
        } catch (error) {
            console.error("Error fetching heroes data:", error);
            setChildren([]);
            setMissions([]);
            setRewards([]);
        } finally {
            setIsLoadingData(false);
        }
    }, [user, currentContext, router]);


    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
            fetchData();
        }
    }, [authLoading, isFamilyLoading, fetchData, currentContext]);


    if (authLoading || isFamilyLoading || isLoadingData || children === null || missions === null || rewards === null) {
        return <Loading />;
    }
    
    // The redirect logic now lives inside fetchData, so this component will only render
    // if there are children to display, or it will show the loader until redirection happens.
    return <HeroesSummary children={children} missionInstances={missions} />;
}


export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesPageContent />
        </Suspense>
    )
}
