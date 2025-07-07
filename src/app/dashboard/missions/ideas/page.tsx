
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Lightbulb, ArrowRight, ArrowLeft, CheckCircle, Search, PackageSearch, Star, BadgeCheckIcon, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PredefinedMissionIdea } from "@/lib/predefined-missions";
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getMissionTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { MissionTemplate } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const rewardFilterOptions = [
    { value: 'all', label: 'Qualquer Recompensa' },
    { value: '5-10', label: 'Hábitos Diários Rápidos (5 ★ | 10 XP)' },
    { value: '10-15', label: 'Responsabilidades e Tarefas (10 ★ | 15 XP)' },
    { value: '15-25', label: 'Desenvolvimento e Estudos (15 ★ | 25 XP)' },
    { value: '20-30', label: 'Comportamento e Gentileza (20 ★ | 30 XP)' },
];

export default function MissionIdeasPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentContext } = useFamily();

    const [userTemplates, setUserTemplates] = useState<MissionTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rewardFilter, setRewardFilter] = useState('all');

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

    const filteredMissionGroups = useMemo(() => {
        const groupsWithFilteredItems = predefinedMissionGroups.map(group => {
            let filteredItems = group.items;

            // Apply reward filter
            if (rewardFilter !== 'all') {
                const [stars, xp] = rewardFilter.split('-').map(Number);
                filteredItems = filteredItems.filter(idea => 
                    idea.starsReward === stars && idea.xpReward === xp
                );
            }
            
            // Apply search term filter
            if (searchTerm.trim()) {
                const lowercasedFilter = searchTerm.toLowerCase();
                filteredItems = filteredItems.filter(idea =>
                    idea.title.toLowerCase().includes(lowercasedFilter)
                );
            }
            
            return { ...group, items: filteredItems };
        });
        return groupsWithFilteredItems.filter(group => group.items.length > 0);
    }, [searchTerm, rewardFilter]);

    const handleUseIdea = (idea: PredefinedMissionIdea) => {
        const queryParams = new URLSearchParams();
        queryParams.append('title', idea.title);
        queryParams.append('category', idea.suggestedAppCategory);
        queryParams.append('starsReward', String(idea.starsReward));
        queryParams.append('xpReward', String(idea.xpReward));
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
                    <CardContent className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
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
                 <CardContent className="p-6 pt-0">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="search-filter" className="sr-only">Busca</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="search-filter"
                                    type="text"
                                    placeholder="Buscar por título (ex: cama, lição)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10"
                                />
                            </div>
                        </div>
                         <div>
                            <Label htmlFor="reward-filter" className="sr-only">Filtro de Recompensa</Label>
                            <Select value={rewardFilter} onValueChange={setRewardFilter}>
                                <SelectTrigger id="reward-filter" className="w-full">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Filtrar por recompensa..." />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {rewardFilterOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {filteredMissionGroups.length > 0 ? (
                <Accordion type="single" collapsible className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {filteredMissionGroups.map((group) => (
                        <AccordionItem value={group.userCategory} key={group.userCategory} className="rounded-lg border bg-card text-card-foreground shadow-md break-inside-avoid">
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
                                                <div className="flex-grow space-y-1">
                                                    <h4 className="font-semibold text-md flex items-center gap-2">
                                                        <span className="text-xl">{idea.emoji}</span>
                                                        <span>{idea.title}</span>
                                                    </h4>
                                                    <div className="flex items-center gap-2 flex-wrap pl-8">
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            <Star className="mr-1.5 h-3 w-3 text-yellow-500 fill-yellow-500" /> {idea.starsReward}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            <BadgeCheckIcon className="mr-1.5 h-3 w-3 text-blue-500" /> {idea.xpReward} XP
                                                        </Badge>
                                                        {alreadyExists && (
                                                            <Badge variant="secondary" className="whitespace-nowrap bg-green-100 text-green-800 border-green-200">
                                                                <CheckCircle className="mr-1.5 h-3.5 w-3.5"/>
                                                                No Catálogo
                                                            </Badge>
                                                        )}
                                                    </div>
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
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">Nenhuma ideia encontrada com os filtros atuais.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente buscar por outras palavras ou alterar o filtro de recompensas.
                  </p>
                </div>
            )}
        </div>
    );
}
