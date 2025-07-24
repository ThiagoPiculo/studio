
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import Loading from './loading';
import { ProgressAnalysis } from '@/components/dashboard/dashboard/ProgressAnalysis';
import { UnlockedRewards } from '@/components/dashboard/dashboard/UnlockedRewards';
import { RecentMedals } from '@/components/dashboard/dashboard/RecentMedals';
import { Reports } from '@/components/dashboard/dashboard/Reports';

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [childData, missionData, rewardData] = await Promise.all([
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionInstancesForContext(user.uid, familyIdToQuery),
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
        ]);
        setChildren(childData);
        setMissionInstances(missionData);
        setRewardTemplates(rewardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, currentContext]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <LayoutGrid className="mr-3 h-8 w-8 text-primary" />
            Painel de Controle
          </CardTitle>
          <CardDescription>
            Sua central de análises e automações para acompanhar a jornada dos seus herois.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ProgressAnalysis childrenProfiles={children} missionInstances={missionInstances} />
          <RecentMedals childrenProfiles={children} />
        </div>
        <div className="space-y-6">
          <UnlockedRewards childrenProfiles={children} rewardTemplates={rewardTemplates} />
          <Reports />
        </div>
      </div>
    </div>
  );
}
