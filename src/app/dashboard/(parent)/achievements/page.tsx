

"use client";

import { Suspense, useMemo, useState } from 'react';
import Loading from './loading';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { Medal, Lock, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { predefinedBadgeCategories, type Badge as BadgeType } from '@/lib/badges';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


function BadgeCard({ badge, childrenProfiles }: { badge: BadgeType, childrenProfiles: any[] }) {
  const isEarned = childrenProfiles.some(child => child.earnedBadgeIds?.includes(badge.id));

  return (
      <div className={cn(
          "flex flex-col text-center gap-3 p-4 border rounded-xl transition-all duration-300 relative overflow-hidden h-full",
          isEarned ? 'shadow-lg bg-card' : 'bg-muted/30'
      )}>
          {isEarned && (
              <Medal className="absolute top-1.5 right-1.5 h-8 w-8 drop-shadow-lg" style={{ color: badge.color }} />
          )}
          <div className="flex-grow flex flex-col items-center gap-3">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative flex-shrink-0", !isEarned && 'bg-gray-400 dark:bg-gray-700')} style={isEarned ? { backgroundColor: `${badge.color}20` } : {}}>
                  <badge.icon className={cn("h-9 w-9", isEarned ? 'text-primary' : "opacity-30")} style={isEarned ? { color: badge.color } : {}}/>
              </div>
              <div className="flex-grow flex flex-col justify-start">
                  <p className={cn("text-sm font-semibold leading-tight", isEarned ? 'text-foreground' : 'text-muted-foreground')}>{badge.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
              </div>
          </div>
      </div>
  );
}

function AchievementsPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId, childrenInContext } = useFamily();
    
    const filteredChildren = useMemo(() => {
        if (!selectedChildId) return childrenInContext;
        return childrenInContext.filter(child => child.id === selectedChildId);
    }, [childrenInContext, selectedChildId]);
    
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
        <Accordion type="multiple" defaultValue={predefinedBadgeCategories.map(c => c.title)} className="w-full space-y-4">
          {predefinedBadgeCategories.map(category => (
            <AccordionItem key={category.title} value={category.title} className="border rounded-lg bg-card text-card-foreground shadow-sm">
              <AccordionTrigger className="p-4 hover:no-underline">
                 <span className="text-lg font-semibold">{category.title}</span>
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {category.items.map((badge) => (
                        <BadgeCard 
                          key={badge.id}
                          badge={badge} 
                          childrenProfiles={filteredChildren} 
                        />
                      ))}
                  </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
