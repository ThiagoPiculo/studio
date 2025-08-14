
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getFamilyMembers, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import type { ChildProfile, UserProfile, FamilyRole, MissionInstance } from '@/lib/types';
import Loading from '@/app/dashboard/loading';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, Users, ArrowRight, Loader2, Link as LinkIcon, Target } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { isMissionScheduledForDate, isMissionCompletedForDate } from '@/lib/calendar-utils';
import { startOfDay } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SpaceDetails = {
    id: string;
    name: string;
    role?: FamilyRole | 'Personal';
    description: string;
    icon: React.ElementType;
    children: ChildProfile[];
    members: UserProfile[];
}

export function SpaceSelector() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading, setCurrentContext } = useFamily();
    const router = useRouter();

    const [spaces, setSpaces] = useState<SpaceDetails[]>([]);
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);

    useEffect(() => {
        if (authLoading || familyLoading) return;

        if (!user) {
            router.replace('/auth/login');
            return;
        }

        const fetchSpaceDetails = async () => {
            setIsLoadingSpaces(true);
            try {
                const spacePromises = availableContexts.map(async (context) => {
                    if (context.id === 'my-space') {
                        const children = await getChildProfilesForAttribution(user.uid, context.id);
                        return {
                            id: context.id,
                            name: "Cuidar Solo",
                            role: "Personal" as const,
                            description: "Seu espaço privado para gerenciar heróis que só você acompanha.",
                            icon: Home,
                            children,
                            members: [user as UserProfile],
                        };
                    } else {
                        const [children, members] = await Promise.all([
                            getChildProfilesForAttribution(user.uid, context.id),
                            getFamilyMembers(context.id)
                        ]);
                        return {
                            id: context.id,
                            name: `Aliança: ${context.name}`,
                            role: context.role,
                            description: "Espaço compartilhado para colaborar com outros responsáveis.",
                            icon: LinkIcon,
                            children,
                            members,
                        };
                    }
                });
                const resolvedSpaces = await Promise.all(spacePromises);
                setSpaces(resolvedSpaces);
            } catch (error) {
                console.error("Error fetching space details:", error);
            } finally {
                setIsLoadingSpaces(false);
            }
        };

        fetchSpaceDetails();
    }, [user, authLoading, familyLoading, availableContexts, router]);

    const handleSelectHero = (contextId: string, childId: string) => {
        setCurrentContext(contextId);
        router.push(`/dashboard/heroes?childId=${childId}`);
    };
    
    const handleAccessSpace = (e: React.MouseEvent, contextId: string) => {
        e.stopPropagation(); // Prevent accordion from toggling
        setCurrentContext(contextId);
        router.push('/dashboard/heroes');
    };

    if (authLoading || familyLoading || isLoadingSpaces) {
        return <Loading />;
    }
    
    const hasAnyChildren = spaces.some(s => s.children.length > 0);
    const hasAlliances = availableContexts.some(c => c.id !== 'my-space');
    
    if (!hasAnyChildren && !hasAlliances) {
        return <GettingStartedGuide hasChildren={false} hasMissions={false} hasRewards={false} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Users className="h-6 w-6 text-primary" />
                        Escolha o Espaço do Mini Heroi
                    </CardTitle>
                    <CardDescription>Selecione um herói para ver suas missões de hoje ou acesse um espaço para uma visão geral.</CardDescription>
                </CardHeader>
            </Card>
            <Accordion type="multiple" className="space-y-4">
                {spaces.map(space => (
                    <AccordionItem value={space.id} key={space.id} className="border-none">
                        <Card className="flex flex-col overflow-hidden">
                            <AccordionTrigger className="p-6 hover:no-underline group">
                                <div className="flex items-center justify-between w-full">
                                    <div>
                                        <CardTitle className="flex items-center gap-3 text-left">
                                            <space.icon className="h-6 w-6 text-primary" />
                                            {space.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1 text-left">{space.description}</CardDescription>
                                    </div>
                                    <Button onClick={(e) => handleAccessSpace(e, space.id)} className="hidden sm:inline-flex ml-4 group-data-[state=open]:hidden">
                                        Ver Espaço <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <div className="sm:hidden ml-4 p-2 rounded-md group-data-[state=open]:rotate-180 transition-transform">
                                        <ChevronDown className="h-5 w-5" />
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {space.children.length > 0 ? (
                                        space.children.map(child => (
                                            <Card key={child.id} className="p-4 flex flex-col items-center gap-4 hover:bg-muted/50 transition-colors sm:flex-row shadow-sm">
                                                <Avatar
                                                    className="h-16 w-16 text-2xl ring-2 ring-offset-background ring-[var(--ring-color)] flex-shrink-0"
                                                    style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                                >
                                                    <AvatarImage src={child.avatar} alt={child.name} />
                                                    <AvatarFallback style={{backgroundColor: child.color}} className="font-bold">{getInitials(child.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-grow space-y-3 text-center sm:text-left w-full">
                                                    <h4 className="font-semibold text-lg">{child.name}</h4>
                                                    <Button onClick={() => handleSelectHero(space.id, child.id)} className="w-full sm:w-auto" size="sm">
                                                        <Target className="mr-2 h-4 w-4"/> Missões de Hoje
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic col-span-full text-center py-4">Nenhum herói neste espaço ainda.</p>
                                    )}
                                </CardContent>
                                <CardFooter className="sm:hidden">
                                    <Button onClick={(e) => handleAccessSpace(e, space.id)} className="w-full">
                                        Ver Espaço <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
