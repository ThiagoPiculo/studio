
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Lightbulb, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PredefinedMissionIdea } from "@/lib/predefined-missions";
import Link from "next/link";

export default function MissionIdeasPage() {
    const router = useRouter();

    const handleUseIdea = (idea: PredefinedMissionIdea) => {
        const queryParams = new URLSearchParams();
        queryParams.append('title', idea.title);
        queryParams.append('category', idea.suggestedAppCategory);
        router.push(`/dashboard/missions/new?${queryParams.toString()}`);
    };

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
                        Não sabe por onde começar? Use estas ideias como base para criar suas próprias missões personalizadas!
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
                                {group.items.map((idea) => (
                                    <li key={idea.title} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <h4 className="font-semibold text-md flex-grow">{idea.title}</h4>
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
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
