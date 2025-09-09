
"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HelpCircle } from "lucide-react";
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { ProgressAnalysis } from '@/components/dashboard/dashboard/ProgressAnalysis';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ProgressAnalysis childrenProfiles={filteredChildren} missionInstances={filteredMissions} />
          <RecentActivities
            childrenProfiles={filteredChildren}
            missionInstances={filteredMissions}
          />
        </div>
        <div className="space-y-6">
          <RecentMedals childrenProfiles={filteredChildren} />
          <Reports />
        </div>
      </div>
    </div>
  );
}
