
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { predefinedRewardGroups } from "@/lib/predefined-reward-ideas";
import type { PredefinedRewardIdea } from "@/lib/predefined-reward-ideas";
import { Sparkles, ArrowRight, ArrowLeft, Search, PackageSearch, Star as StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";

export default function RewardIdeasPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const handleUseIdea = (idea: PredefinedRewardIdea) => {
        const queryParams = new URLSearchParams();
        queryParams.append('title', idea.title);
        if (idea.description) {
            queryParams.append('description', idea.description);
        }
        queryParams.append('category', idea.suggestedAppCategory);
        if (idea.isMaterialSuggestion !== undefined) {
            queryParams.append('isMaterial', String(idea.isMaterialSuggestion));
        }
        if (idea.starsCost) {
            queryParams.append('starsCost', String(idea.starsCost));
        }
        router.push(`/dashboard/rewards/new?${queryParams.toString()}`);
    };
    
    const groupIdeasBySubCategory = (items: PredefinedRewardIdea[]) => {
        return items.reduce((acc, idea) => {
          const subCategory = idea.userSubCategory || 'Outras Ideias';
          if (!acc[subCategory]) {
            acc[subCategory] = [];
          }
          acc[subCategory].push(idea);
          return acc;
        }, {} as Record<string, PredefinedRewardIdea[]>);
    };

    const filteredRewardGroups = useMemo(() => {
        if (!searchTerm.trim()) {
            return predefinedRewardGroups;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        const groupsWithFilteredItems = predefinedRewardGroups.map(group => {
            const filteredItems = group.items.filter(idea =>
                idea.title.toLowerCase().includes(lowercasedFilter) ||
                (idea.description && idea.description.toLowerCase().includes(lowercasedFilter))
            );
            return { ...group, items: filteredItems };
        });
        return groupsWithFilteredItems.filter(group => group.items.length > 0);
    }, [searchTerm]);


    return (
        <div className="space-y-8 pb-10">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Catálogo
            </Button>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center">
                        <Sparkles className="mr-3 h-8 w-8 text-accent" />
                        Inspire-se: Ideias de Recompensas
                    </CardTitle>
                    <CardDescription>
                        Não sabe por onde começar? Use estas ideias como base para criar suas recompensas!
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar ideias de recompensas (ex: cinema, jogo, passeio)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {filteredRewardGroups.length > 0 ? (
                <Accordion type="single" collapsible className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {filteredRewardGroups.map((group) => {
                    const groupedIdeas = groupIdeasBySubCategory(group.items);
                    return (
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
                        {Object.entries(groupedIdeas).map(([subCategory, ideas]) => (
                            <Fragment key={subCategory}>
                            {subCategory !== 'Outras Ideias' && <h4 className="font-semibold text-md text-primary/80 mt-4 mb-2 border-b pb-1">{subCategory}</h4>}
                            <ul className="space-y-3 pt-2">
                                {ideas.map((idea) => (
                                <li key={idea.title} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                        <h5 className="font-semibold text-md">{idea.title}</h5>
                                        {idea.starsCost && (
                                            <p className="text-sm font-medium text-amber-600 flex items-center gap-1 mt-1">
                                                <StarIcon className="h-4 w-4 fill-amber-500 text-amber-500" />
                                                Custo Sugerido: {idea.starsCost} estrelas
                                            </p>
                                        )}
                                        {idea.description && <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>}
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleUseIdea(idea)}
                                        className="mt-2 sm:mt-0 flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                                    >
                                        Usar esta Ideia <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    </div>
                                </li>
                                ))}
                            </ul>
                            </Fragment>
                        ))}
                        </AccordionContent>
                    </AccordionItem>
                    );
                })}
                </Accordion>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">Nenhuma ideia encontrada para "{searchTerm}".</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente buscar por outras palavras.
                  </p>
                </div>
            )}
        </div>
    );
}
