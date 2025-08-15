

"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HelpCircle } from "lucide-react";
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
import { useFamily } from '@/contexts/FamilyContext';


interface DashboardClientPageProps {
    initialData: {
        children: ChildProfile[];
        missions: MissionInstance[];
        rewards: RewardTemplate[];
    }
}

export function DashboardClientPage({ initialData }: DashboardClientPageProps) {
  const { children: allChildren, missions: missionInstances, rewards: rewardTemplates } = initialData;
  const { selectedChildId, setSelectedChildId } = useFamily();

  const filteredChildren = useMemo(() => {
    if (!selectedChildId) return allChildren;
    return allChildren.filter(child => child.id === selectedChildId);
  }, [allChildren, selectedChildId]);
  
  const filteredMissions = useMemo(() => {
    if (!selectedChildId) return missionInstances;
    return missionInstances.filter(mission => mission.childId === selectedChildId);
  }, [missionInstances, selectedChildId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <CalendarCheck2 className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-headline font-bold">Progressos do Herói</h2>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                    <div className="space-y-3">
                         <h4 className="font-medium leading-none">Central de Análises</h4>
                        <p className="text-sm text-muted-foreground">Esta é a sua central de análises para acompanhar a jornada dos seus heróis, com gráficos de desempenho, recompensas desbloqueadas e as últimas medalhas conquistadas.</p>
                        <PopoverClose asChild>
                            <Button className="w-full">Entendi 👍</Button>
                        </PopoverClose>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <HeroSelector
            heroes={allChildren}
            selectedHeroId={selectedChildId}
            onSelectHero={setSelectedChildId}
            showAllOption={true}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ProgressAnalysis childrenProfiles={filteredChildren} missionInstances={filteredMissions} />
          <RecentActivities
            childrenProfiles={filteredChildren}
            missionInstances={filteredMissions}
          />
        </div>
        <div className="space-y-6">
          <UnlockedRewards childrenProfiles={filteredChildren} rewardTemplates={rewardTemplates} />
          <RecentMedals childrenProfiles={filteredChildren} />
          <Reports />
        </div>
      </div>
    </div>
  );
}
