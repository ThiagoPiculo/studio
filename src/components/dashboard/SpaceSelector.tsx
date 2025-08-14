
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
import { Home, Users, ArrowRight, Loader2, Link as LinkIcon } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '../ui/separator';

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
                            role: "Personal",
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

    const handleSelectContext = (contextId: string) => {
        setCurrentContext(contextId);
        router.push('/dashboard/heroes');
    };

    if (authLoading || familyLoading || isLoadingSpaces) {
        return <Loading />;
    }
    
    const hasAnyChildren = spaces.some(s => s.children.length > 0);
    const hasAlliances = availableContexts.some(c => c.id !== 'my-space');
    
    if (!hasAnyChildren && !hasAlliances) {
        // This will redirect to /novo-heroi eventually, which is what we want for a truly new user.
        return <GettingStartedGuide hasChildren={false} hasMissions={false} hasRewards={false} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Users className="h-6 w-6 text-primary" />
                        Escolha seu Espaço de Trabalho
                    </CardTitle>
                    <CardDescription>Selecione um espaço para gerenciar as missões e o progresso dos seus Mini Herois.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {spaces.map(space => (
                    <Card key={space.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <space.icon className="h-6 w-6 text-primary" />
                                {space.name}
                            </CardTitle>
                            <CardDescription>{space.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                           <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">Mini Herois</h4>
                                {space.children.length > 0 ? (
                                    <div className="flex -space-x-2">
                                        {space.children.map(child => (
                                            <Avatar key={child.id} className="h-8 w-8 border-2 border-background">
                                                <AvatarImage src={child.avatar} alt={child.name} />
                                                <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Nenhum herói aqui.</p>
                                )}
                            </div>
                           {space.id !== 'my-space' && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-muted-foreground">Membros da Aliança</h4>
                                        <div className="flex -space-x-2">
                                            {space.members.map(member => (
                                                <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                    </div>
                                </>
                           )}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleSelectContext(space.id)}>
                                Acessar Espaço <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
