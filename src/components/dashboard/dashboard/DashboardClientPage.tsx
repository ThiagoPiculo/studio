
"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, HelpCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import Loading from '@/app/dashboard/loading';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { ProgressAnalysis } from '@/components/dashboard/dashboard/ProgressAnalysis';
import { UnlockedRewards } from '@/components/dashboard/dashboard/UnlockedRewards';
import { RecentMedals } from '@/components/dashboard/dashboard/RecentMedals';
import { Reports } from '@/components/dashboard/dashboard/Reports';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function DashboardClientPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);

  const childIdFromParams = searchParams.get('childId');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childIdFromParams);

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
        setAllChildren(childData);
        setMissionInstances(missionData);
        setRewardTemplates(rewardData);
        
        if (childIdFromParams && childData.some(c => c.id === childIdFromParams)) {
          setSelectedChildId(childIdFromParams);
        } else if (childData.length > 0) {
          setSelectedChildId(null);
        } else {
          setSelectedChildId(null);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, currentContext, childIdFromParams]);

  const selectedChildData = useMemo(() => {
    if (!selectedChildId) {
        return {
            children: allChildren,
            missions: missionInstances,
            rewards: rewardTemplates,
        };
    }
    return {
        children: allChildren.filter(c => c.id === selectedChildId),
        missions: missionInstances.filter(m => m.childId === selectedChildId),
        rewards: rewardTemplates,
    }
  }, [selectedChildId, allChildren, missionInstances, rewardTemplates]);


  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <LayoutGrid className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-headline font-bold">Painel de Controle</h2>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm">
                  Sua central de análises e automações para acompanhar a jornada dos seus herois.
                </PopoverContent>
            </Popover>
        </div>
        {allChildren.length > 0 && (
            <HeroSelector
            heroes={allChildren}
            selectedHeroId={selectedChildId}
            onSelectHero={setSelectedChildId}
            showAllOption={true}
            />
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ProgressAnalysis childrenProfiles={selectedChildData.children} missionInstances={selectedChildData.missions} />
          <RecentMedals childrenProfiles={selectedChildData.children} />
        </div>
        <div className="space-y-6">
          <UnlockedRewards childrenProfiles={selectedChildData.children} rewardTemplates={selectedChildData.rewards} />
          <Reports />
        </div>
      </div>
    </div>
  );
}
