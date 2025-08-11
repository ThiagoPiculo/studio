
"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, HelpCircle } from "lucide-react";
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { ProgressAnalysis } from '@/components/dashboard/dashboard/ProgressAnalysis';
import { UnlockedRewards } from '@/components/dashboard/dashboard/UnlockedRewards';
import { RecentMedals } from '@/components/dashboard/dashboard/RecentMedals';
import { Reports } from '@/components/dashboard/dashboard/Reports';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { RecentActivities } from './RecentActivities';


interface DashboardClientPageProps {
    initialData: {
        children: ChildProfile[];
        missions: MissionInstance[];
        rewards: RewardTemplate[];
    }
}

export function DashboardClientPage({ initialData }: DashboardClientPageProps) {
  const { children: allChildren, missions: missionInstances, rewards: rewardTemplates } = initialData;

  const searchParams = useSearchParams();
  const childIdFromParams = searchParams.get('childId');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childIdFromParams);

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


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <LayoutGrid className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-headline font-bold">Painel de Progressos</h2>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                    <div className="space-y-3">
                        <p className="text-sm">Sua central de análises para acompanhar a jornada dos seus herois, com gráficos de desempenho, recompensas e medalhas.</p>
                        <PopoverClose asChild>
                            <Button className="w-full">Entendi 👍</Button>
                        </PopoverClose>
                    </div>
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
          <RecentActivities
            childrenProfiles={selectedChildData.children}
            missionInstances={selectedChildData.missions}
          />
        </div>
        <div className="space-y-6">
          <UnlockedRewards childrenProfiles={selectedChildData.children} rewardTemplates={selectedChildData.rewards} />
          <RecentMedals childrenProfiles={selectedChildData.children} />
          <Reports />
        </div>
      </div>
    </div>
  );
}
