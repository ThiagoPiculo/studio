
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getFamilyMembers } from '@/lib/firebase/firestore';
import type { ChildProfile, UserProfile, FamilyRole } from '@/lib/types';
import Loading from '@/app/dashboard/loading';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, Users, ArrowRight, Loader2, Link as LinkIcon, Target } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type SpaceDetails = {
    id: string;
    name: string;
    role?: FamilyRole | 'Personal';
    children: ChildProfile[];
    members: UserProfile[];
}

export function SpaceSelector() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading, setCurrentContext } = useFamily();
    const router = useRouter();

    const [spaces, setSpaces] = useState<SpaceDetails[]>([]);
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
    const [totalChildrenCount, setTotalChildrenCount] = useState(0);

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
                            name: context.name,
                            role: context.role,
                            children,
                            members,
                        };
                    }
                });
                const resolvedSpaces = await Promise.all(spacePromises);
                setSpaces(resolvedSpaces);
                setTotalChildrenCount(resolvedSpaces.reduce((acc, space) => acc + space.children.length, 0));
            } catch (error) {
                console.error("Error fetching space details:", error);
            } finally {
                setIsLoadingSpaces(false);
            }
        };

        fetchSpaceDetails();
    }, [user, authLoading, familyLoading, availableContexts, router]);
    
    const isSoloUser = availableContexts.length === 1 && totalChildrenCount > 0;

    useEffect(() => {
        if (isSoloUser) {
            router.replace('/dashboard/heroes');
        }
    }, [isSoloUser, router]);

    const handleAccessSpace = (contextId: string) => {
        setCurrentContext(contextId);
        router.push('/dashboard/heroes');
    };

    if (authLoading || familyLoading || isLoadingSpaces || isSoloUser) {
        return <Loading />;
    }
    
    const isNewUser = totalChildrenCount === 0 && availableContexts.length <= 1;
    if (isNewUser) {
        return <GettingStartedGuide hasChildren={false} hasMissions={false} hasRewards={false} />;
    }
    
    // Default case: User has multiple contexts (alliances or solo + alliance)
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Users className="h-6 w-6 text-primary" />
                        Escolha o Espaço de Início
                    </CardTitle>
                    <CardDescription>Acesse um espaço para ver a rotina e o progresso dos seus heróis.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {spaces.map(space => {
                    const Icon = space.id === 'my-space' ? Home : LinkIcon;
                    return (
                        <Card key={space.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader>
                               <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-primary/10">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-lg">{space.name}</h3>
                                    </div>
                                    <Button variant="link" className="p-0 h-auto" onClick={() => handleAccessSpace(space.id)}>
                                        Ver Espaço <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                             <CardContent className="flex-grow flex items-center min-h-[40px]">
                                {space.children.length > 0 ? (
                                    <div className="flex items-center -space-x-2">
                                        {space.children.map(child => (
                                            <Avatar key={child.id} className="h-9 w-9 border-2 border-background">
                                                <AvatarImage src={child.avatar} alt={child.name} />
                                                <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Nenhum herói neste espaço.</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
