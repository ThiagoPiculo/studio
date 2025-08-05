
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from './loading';
import { DashboardClientPage } from '@/components/dashboard/dashboard/DashboardClientPage';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';


function DashboardPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [initialData, setInitialData] = useState<{
        children: ChildProfile[];
        missions: MissionInstance[];
        rewards: RewardTemplate[];
    } | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            if (!authLoading) {
              setInitialData({ children: [], missions: [], rewards: [] });
            }
            return;
        };
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
            const [childData, missionData, rewardData] = await Promise.all([
              getChildProfilesForAttribution(user.uid, currentContext),
              getMissionInstancesForContext(user.uid, familyIdToQuery),
              getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
            ]);
            setInitialData({
                children: childData,
                missions: missionData,
                rewards: rewardData
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setInitialData({ children: [], missions: [], rewards: [] });
        }
    }, [user, currentContext, authLoading]);

    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
            fetchData();
        }
    }, [authLoading, isFamilyLoading, fetchData]);

    if (!initialData) {
        return <Loading />;
    }
    
    return <DashboardClientPage initialData={initialData} />;
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<Loading />}>
            <DashboardPageContent />
        </Suspense>
    );
}

