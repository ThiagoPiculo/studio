
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getRewardTemplatesByOwnerOrFamily, getMissionInstancesForContext } from '@/lib/supabase/db';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { supabase } from '@/lib/supabase/config';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);
    const [rewards, setRewards] = useState<RewardTemplate[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (authLoading || isFamilyLoading || !user) {
            if (!user && !authLoading) {
                setIsLoadingData(false);
                setChildren([]);
                setMissions([]);
                setRewards([]);
            }
            return;
        }

        setIsLoadingData(true);
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

        const fetchStaticData = async () => {
            try {
                const [childData, rewardData] = await Promise.all([
                    getChildProfilesForAttribution(user.uid, currentContext),
                    getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
                ]);
                setChildren(childData);
                setRewards(rewardData);
            } catch (error) {
                console.error("Error fetching static data for heroes page:", error);
                setChildren([]);
                setRewards([]);
            }
        };

        fetchStaticData();

        const loadMissions = async () => {
            try {
                const missionData = await getMissionInstancesForContext(user.uid, currentContext);
                setMissions(missionData);
            } catch (error) {
                console.error("Error fetching missions:", error);
                setMissions([]);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadMissions();

        const filter = familyIdToQuery
            ? `family_id=eq.${familyIdToQuery}`
            : `owner_id=eq.${user.uid}`;

        const channel = supabase
            .channel(`heroes-missions:${currentContext}:${user.uid}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mission_instances',
                filter,
            }, () => { loadMissions(); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
