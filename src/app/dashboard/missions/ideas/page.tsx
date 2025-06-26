
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Lightbulb, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PredefinedMissionIdea } from "@/lib/predefined-missions";
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getMissionTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { MissionTemplate } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";

export default function MissionIdeasPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentContext } = useFamily();

    const [userTemplates, setUserTemplates] = useState<MissionTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
            .then(setUserTemplates)
            .catch((err) => {
                console.error("Error fetching user mission templates:", err);
            })
            .finally(() => setIsLoading(false));
    }, [user, currentContext]);

    const existingTitles = useMemo(() => {
        // Normalize titles for comparison: lowercase and trim whitespace
        return new Set(userTemplates.map(t => t.title.trim().toLowerCase()));
    }, [userTemplates]);

    const handleUseIdea = (idea: PredefinedMissionIdea) => {
        const queryParams = new URLSearchParams();
        queryParams.append('title', idea.title);
        queryParams.append('category', idea.suggestedAppCategory);
        router.push(`/dashboard/missions/new?${queryParams.toString()}`);
    };
    
    const handleGoToCatalog = () => {
        router.push('/dashboard/missions');
    }

    if (isLoading) {
        return (
            <div className="space-y-8 pb-10">
                <Skeleton className="h-10 w-64" />
                <Card className="shadow-lg">
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                    </CardHeader>
                </Card>
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Central de Missões
            </Button>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center">
                        <Lightbulb className="mr-3 h-8 w-8 text-accent" />
                        Inspire-se: Ideias de Missões
                    </CardTitle>
                    <CardDescription>
                        Use estas ideias como base para criar missões! Se uma ideia já existe no seu catálogo, você pode gerenciá-la diretamente.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {predefinedMissionGroups.map((group) => (
                    <AccordionItem value={group.userCategory} key={group.userCategory} className="rounded-lg border bg-card text-card-foreground shadow-md">
                        <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                           <div className="flex items-center gap-3">
                                <group.icon className="h-7 w-7 text-primary" />
                                <div>
                                    <h3 className="text-2xl font-headline">{group.userCategory}</h3>
                                    <p className="text-sm text-muted-foreground font-normal mt-1">{group.description}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <ul className="space-y-3 pt-1">
                                {group.items.map((idea) => {
                                    const alreadyExists = existingTitles.has(idea.title.trim().toLowerCase());
                                    return (
                                     <li key={idea.title} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="flex items-center gap-2 flex-grow flex-wrap">
                                                <h4 className="font-semibold text-md">{idea.title}</h4>
                                                {alreadyExists && (
                                                    <Badge variant="secondary" className="whitespace-nowrap bg-green-100 text-green-800 border-green-200">
                                                        <CheckCircle className="mr-1.5 h-3.5 w-3.5"/>
                                                        No Catálogo
                                                    </Badge>
                                                )}
                                            </div>
                                            {alreadyExists ? (
                                                 <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    onClick={handleGoToCatalog}
                                                    className="mt-2 sm:mt-0 flex-shrink-0"
                                                >
                                                    Gerenciar no Catálogo <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleUseIdea(idea)}
                                                    className="mt-2 sm:mt-0 flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                                                >
                                                    Usar esta Ideia <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                    )
                                })}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
