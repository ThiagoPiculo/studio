'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { ChildProfile } from '@/lib/types';
import { getChildProfileById } from '@/lib/firebase/firestore';
import { predefinedBadgeCategories, type Badge as BadgeType } from '@/lib/badges';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Medal, Lock } from "lucide-react";
import Loading from '../loading';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function BadgeCard({ badge, isEarned }: { badge: BadgeType, isEarned: boolean }) {
    return (
        <div className={cn(
            "flex flex-col text-center items-center gap-2 p-3 border rounded-xl transition-all duration-300 h-full",
            isEarned ? 'shadow-md bg-card' : 'bg-muted/30'
        )}>
            {!isEarned && (
                <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground/50" />
            )}
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative flex-shrink-0", !isEarned && 'bg-gray-400/30 dark:bg-gray-700/30')}>
                <badge.icon className={cn("h-9 w-9", isEarned ? 'text-primary' : "text-muted-foreground/40")} style={isEarned ? { color: badge.color } : {}}/>
            </div>
            <div className="flex-grow flex flex-col justify-start">
                <p className={cn("text-sm font-semibold leading-tight", isEarned ? 'text-foreground' : 'text-muted-foreground')}>{badge.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
            </div>
        </div>
    );
}

export default function AchievementsPage() {
    const params = useParams();
    const childId = params.childId as string;
    const { toast } = useToast();

    const [child, setChild] = useState<ChildProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (childId) {
            setIsLoading(true);
            getChildProfileById(childId)
                .then(setChild)
                .catch(error => {
                    console.error("Error fetching child profile:", error);
                    toast({ title: 'Erro ao buscar perfil do herói', variant: 'destructive' });
                })
                .finally(() => setIsLoading(false));
        }
    }, [childId, toast]);

    const earnedBadgeIds = useMemo(() => new Set(child?.earnedBadgeIds || []), [child]);
    const totalEarned = earnedBadgeIds.size;

    if (isLoading || !child) {
        return <Loading />;
    }

    return (
        <div className="p-4 pb-24 space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold font-headline">Quadro de Medalhas</h1>
                <p className="text-muted-foreground">Suas incríveis conquistas na jornada de herói!</p>
                <div className="mt-4">
                    <Badge variant="secondary" className="text-base py-1 px-4">
                        <Medal className="mr-2 h-5 w-5 text-amber-500" />
                        {totalEarned} Medalhas Conquistadas
                    </Badge>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={predefinedBadgeCategories.map(c => c.title)} className="w-full space-y-4">
                {predefinedBadgeCategories.map(category => (
                    <AccordionItem key={category.title} value={category.title} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <span className="text-lg font-semibold">{category.title}</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {category.items.map((badge) => (
                                    <BadgeCard
                                        key={badge.id}
                                        badge={badge}
                                        isEarned={earnedBadgeIds.has(badge.id)}
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
