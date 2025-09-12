
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


function BadgeCard({ badge, childrenProfiles, isCalculatingProgress, onClick }: { badge: BadgeType, childrenProfiles: any[], isCalculatingProgress: boolean, onClick: () => void }) {
  // Simplified logic to just show if *any* of the selected children have earned it.
  const isEarned = childrenProfiles.some(child => child.earnedBadgeIds?.includes(badge.id));

  return (
      <div onClick={onClick} className={cn("flex flex-col items-center justify-start text-center gap-2 p-4 border rounded-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden", isEarned ? 'shadow-lg bg-card' : 'bg-muted/30')}>
          {isEarned && (
              <Medal className="absolute top-1.5 right-1.5 h-8 w-8 drop-shadow-lg" style={{ color: badge.color }} />
          )}
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative", !isEarned && 'bg-gray-400 dark:bg-gray-700')} style={isEarned ? { backgroundColor: badge.color } : {}}>
              <badge.icon className={cn("h-9 w-9 text-white", !isEarned && "opacity-30")} />
          </div>
          <div className="flex-grow h-12 flex flex-col justify-center w-full">
              <p className={cn("text-sm font-semibold leading-tight", isEarned ? 'text-foreground' : 'text-muted-foreground')}>{badge.title}</p>
          </div>
      </div>
  );
}

function AchievementsPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId, childrenInContext } = useFamily();
    const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);

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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Medal className="h-6 w-6 text-primary" />
                    Quadro de Medalhas Geral
                </CardTitle>
                <CardDescription>
                    Explore todas as medalhas e veja quais heróis já as desbloquearam.
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
        
        <Dialog open={!!selectedBadge} onOpenChange={(isOpen) => !isOpen && setSelectedBadge(null)}>
            <Accordion type="multiple" defaultValue={predefinedBadgeCategories.map(c => c.title)} className="w-full space-y-4">
              {predefinedBadgeCategories.map(category => (
                <AccordionItem key={category.title} value={category.title} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                  <AccordionTrigger className="p-4 hover:no-underline">
                     <span className="text-lg font-semibold">{category.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                          {category.items.map((badge) => (
                              <DialogTrigger asChild key={badge.id}>
                                <BadgeCard 
                                  badge={badge} 
                                  childrenProfiles={filteredChildren} 
                                  isCalculatingProgress={false} // Progress logic is complex, simplified for this view
                                  onClick={() => setSelectedBadge(badge)} 
                                />
                              </DialogTrigger>
                          ))}
                      </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
             {selectedBadge && (
                <DialogContent>
                    <DialogHeader className="items-center text-center">
                    <div className="p-4 rounded-full mb-4" style={{ backgroundColor: selectedBadge.color }}>
                        <selectedBadge.icon className="h-12 w-12 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-headline">{selectedBadge.title}</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground pt-2">
                        {selectedBadge.description}
                    </DialogDescription>
                    </DialogHeader>
                    
                    <div className="text-center pt-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 text-sm">
                            {filteredChildren.some(c => c.earnedBadgeIds?.includes(selectedBadge.id)) ? "Conquistado!" : "Ainda não conquistado"}
                        </Badge>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full">Fechar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
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
