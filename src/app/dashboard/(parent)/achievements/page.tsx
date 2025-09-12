
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from './loading';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile } from '@/lib/types';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { Medal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentMedals } from '@/components/dashboard/dashboard/RecentMedals';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';

function AchievementsPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId, childrenInContext } = useFamily();

    const filteredChildren = childrenInContext.filter(child => !selectedChildId || child.id === selectedChildId);

    if (authLoading || isFamilyLoading) {
        return <Loading />;
    }

    if (childrenInContext.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false} 
                hasRewards={false}
            />
        )
    }
    
    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Medal className="h-6 w-6 text-primary" />
                    Quadro de Medalhas Geral
                </CardTitle>
                <CardDescription>
                    Veja todas as medalhas e conquistas desbloqueadas por seus heróis em um só lugar.
                </CardDescription>
            </CardHeader>
            {childrenInContext.length > 1 && (
                <CardContent>
                    <div className="max-w-xs">
                       <HeroSelector heroes={childrenInContext} selectedHeroId={selectedChildId} onSelectHero={setSelectedChildId} showAllOption={true} />
                    </div>
                </CardContent>
            )}
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChildren.map(child => (
                <div key={child.id} className="h-full">
                    <RecentMedals childrenProfiles={[child]} />
                </div>
            ))}
        </div>
      </div>
    );
}

export default function AchievementsPage() {
    return (
        <Suspense fallback={<Loading />}>
            <AchievementsPageContent />
        </Suspense>
    );
}
