
"use client";

import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/dashboard/loading';
import { getChildProfilesByOwner, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { CircleDot, Link as LinkIcon, ArrowRight, Loader2, Rocket } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface SpaceCardProps {
    id: string;
    name: string;
    icon: React.ElementType;
    childrenData: { profiles: ChildProfile[] | undefined, isLoading: boolean };
    onClick: (id: string) => void;
    isCurrent: boolean;
}

const SpaceCard = ({ id, name, icon: Icon, childrenData, onClick, isCurrent }: SpaceCardProps) => (
    <Card 
        className={`shadow-lg hover:shadow-xl transition-all border-2 ${isCurrent ? 'border-primary' : 'border-transparent'}`}
        onClick={() => onClick(id)}
    >
        <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center`}>
                        <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{name}</CardTitle>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Mini Herois neste espaço:</p>
            {childrenData.isLoading ? (
                 <div className="flex -space-x-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                 </div>
            ) : childrenData.profiles && childrenData.profiles.length > 0 ? (
                <div className="flex items-center -space-x-2">
                    {childrenData.profiles.slice(0,5).map(child => (
                        <Avatar key={child.id} className="h-9 w-9 border-2 border-card">
                            <AvatarImage src={child.avatar} alt={child.name} />
                            <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                        </Avatar>
                    ))}
                    {childrenData.profiles.length > 5 && (
                        <Avatar className="h-9 w-9 border-2 border-card">
                            <AvatarFallback>+{childrenData.profiles.length - 5}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ) : (
                <p className="text-sm italic text-muted-foreground">Nenhum herói aqui.</p>
            )}
        </CardContent>
    </Card>
);


export default function SpaceSelector() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, setCurrentContext, isLoading: familyLoading, currentContext } = useFamily();
    const router = useRouter();

    const [childrenByContext, setChildrenByContext] = useState<Record<string, ChildProfile[]>>({});
    const [isLoadingChildren, setIsLoadingChildren] = useState(true);

    // Initial check effect
    useEffect(() => {
        if (authLoading || familyLoading) return;

        if (!user) {
            router.replace('/auth/login');
            return;
        }

        const fetchChildrenForAllContexts = async () => {
            if (availableContexts.length > 0) {
                const childPromises = availableContexts.map(async (context) => {
                    if (context.id === 'my-space') {
                        const children = await getChildProfilesByOwner(user.uid, true);
                        return { contextId: context.id, children };
                    } else {
                        const children = await getChildProfilesByFamily(context.id);
                        return { contextId: context.id, children };
                    }
                });

                const results = await Promise.all(childPromises);
                const childrenMap: Record<string, ChildProfile[]> = {};
                results.forEach(res => {
                    childrenMap[res.contextId] = res.children;
                });
                setChildrenByContext(childrenMap);
            }
            setIsLoadingChildren(false);
        };
        
        fetchChildrenForAllContexts();

    }, [user, authLoading, familyLoading, router, availableContexts]);
    
    // Logic for redirection
    useEffect(() => {
        if (isLoadingChildren || authLoading || familyLoading) return;

        const allChildren = Object.values(childrenByContext).flat();
        
        // This is a new user with no children and no alliances
        if (allChildren.length === 0 && availableContexts.length <= 1) {
            router.replace('/dashboard/assistente');
        } 
        // This is an existing user with children but only in their personal space
        else if (allChildren.length > 0 && availableContexts.length <= 1) {
            router.replace('/dashboard/heroes');
        }
        // If there are alliances or a choice to be made, we stay on this page.
        
    }, [isLoadingChildren, authLoading, familyLoading, childrenByContext, availableContexts, router]);


    const handleSelectContext = (contextId: string) => {
        setCurrentContext(contextId);
        router.push('/dashboard/heroes');
    };

    const mySpaceContext = availableContexts.find(c => c.id === 'my-space');
    const allianceContexts = availableContexts.filter(c => c.id !== 'my-space');
    
    // We only render the full UI if there are choices to be made. Otherwise, the effect will redirect.
    if (isLoadingChildren || authLoading || familyLoading || (Object.values(childrenByContext).flat().length === 0 && availableContexts.length <= 1) || (Object.values(childrenByContext).flat().length > 0 && availableContexts.length <= 1) ) {
        return <Loading />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Rocket className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Bem-vindo(a), {user?.name || 'Mestre dos Herois'}!</CardTitle>
                            <CardDescription>Selecione um espaço para continuar sua jornada.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mySpaceContext && (
                     <SpaceCard
                        id={mySpaceContext.id}
                        name={mySpaceContext.name}
                        icon={CircleDot}
                        childrenData={{ profiles: childrenByContext['my-space'], isLoading: isLoadingChildren }}
                        onClick={handleSelectContext}
                        isCurrent={currentContext === 'my-space'}
                    />
                )}
                {allianceContexts.map(context => (
                    <SpaceCard
                        key={context.id}
                        id={context.id}
                        name={`Aliança: ${context.name}`}
                        icon={LinkIcon}
                        childrenData={{ profiles: childrenByContext[context.id], isLoading: isLoadingChildren }}
                        onClick={handleSelectContext}
                        isCurrent={currentContext === context.id}
                    />
                ))}
            </div>
        </div>
    );
}
