
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { convertTimestampsInObject } from '@/lib/utils';

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

        let missionsQuery;
        if (familyIdToQuery) {
            missionsQuery = query(collection(db, 'missionInstances'), where('familyId', '==', familyIdToQuery));
        } else {
            missionsQuery = query(collection(db, 'missionInstances'), where('ownerId', '==', user.uid), where('familyId', '==', null));
        }

        const unsubscribe = onSnapshot(missionsQuery, (snapshot) => {
            const missionData = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
            setMissions(missionData);
            if(isLoadingData) setIsLoadingData(false);
        }, (error) => {
            console.error("Error fetching real-time missions:", error);
            setMissions([]);
            setIsLoadingData(false);
        });

        return () => unsubscribe();
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
