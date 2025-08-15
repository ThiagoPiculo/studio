// src/app/dashboard/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from './loading';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { DashboardClientPage } from '@/components/dashboard/dashboard/DashboardClientPage';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';


function ProgressosPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    
    const [initialData, setInitialData] = useState<{
        children: ChildProfile[];
        missions: MissionInstance[];
        rewards: RewardTemplate[];
    } | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            setInitialData({ children: [], missions: [], rewards: [] });
            return;
        }
        
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
            const [children, missions, rewards] = await Promise.all([
                getChildProfilesForAttribution(user.uid, currentContext),
                getMissionInstancesForContext(user.uid, currentContext),
                getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
            ]);
            setInitialData({ children, missions, rewards });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setInitialData({ children: [], missions: [], rewards: [] });
        }
    }, [user, currentContext]);
  
    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
            fetchData();
        }
    }, [authLoading, isFamilyLoading, fetchData]);

    if (authLoading || isFamilyLoading || !initialData) {
        return <Loading />;
    }
    
    const hasAnyContent = initialData.children.length > 0;
    if (!hasAnyContent) {
        return (
             <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false} 
                hasRewards={false}
            />
        )
    }
    
    return <DashboardClientPage initialData={initialData} />;
}

export default function ProgressosPage() {
    return (
        <Suspense fallback={<Loading />}>
            <ProgressosPageContent />
        </Suspense>
    );
}
