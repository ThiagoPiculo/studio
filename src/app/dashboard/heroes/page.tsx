
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);
    const [rewards, setRewards] = useState<RewardTemplate[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!user || authLoading || isFamilyLoading) {
            if (!authLoading && !isFamilyLoading) {
                 setChildren([]);
                 setMissions([]);
                 setRewards([]);
                 setIsLoadingData(false);
            }
            return;
        }
        
        setIsLoadingData(true);
        const fetchData = async () => {
            try {
                const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
                const [childData, missionData, rewardData] = await Promise.all([
                    getChildProfilesForAttribution(user.uid, currentContext),
                    getMissionInstancesForContext(user.uid, currentContext),
                    getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
                ]);
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
        };

        fetchData();
    }, [user, currentContext, authLoading, isFamilyLoading]);


    if (authLoading || isFamilyLoading || isLoadingData || children === null || missions === null || rewards === null) {
        return <Loading />;
    }
    
    if (children.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={missions.length > 0}
                hasRewards={rewards.length > 0}
            />
        );
    }
    
    return <HeroesSummary initialChildren={children} initialMissionInstances={missions} />;
}


export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesPageContent />
        </Suspense>
    )
}
