
"use client";

import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/dashboard/(parent)/meus-herois/loading';
import { getChildProfilesByOwner, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { CircleDot, Link as LinkIcon, ArrowRight, Loader2, Rocket, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import Link from 'next/link';

interface HeroCardProps {
    child: ChildProfile;
    onClick: () => void;
}

const HeroCard = ({ child, onClick }: HeroCardProps) => (
    <div className="flex flex-col items-center gap-2">
        <button 
            onClick={onClick}
            className="w-24 h-24 rounded-full transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/50"
        >
            <Avatar className="w-full h-full text-4xl border-4 shadow-md" style={{ borderColor: child.color }}>
                <AvatarImage src={child.avatar} alt={child.name} />
                <AvatarFallback className="font-bold" style={{ backgroundColor: child.color }}>
                    {getInitials(child.name)}
                </AvatarFallback>
            </Avatar>
        </button>
        <p className="text-sm font-semibold text-center truncate w-24">{child.name}</p>
    </div>
);


export default function SpaceSelector() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, setCurrentContext, isLoading: familyLoading, setSelectedChildId } = useFamily();
    const router = useRouter();

    const [childrenByContext, setChildrenByContext] = useState<Record<string, ChildProfile[]>>({});
    const [isLoadingChildren, setIsLoadingChildren] = useState(true);

    useEffect(() => {
        if (!user || availableContexts.length === 0) {
            setIsLoadingChildren(false);
            return;
        }

        const fetchChildrenForAllContexts = async () => {
            setIsLoadingChildren(true);
            const childrenData: Record<string, ChildProfile[]> = {};
            const promises = availableContexts.map(async (context) => {
                const children = context.id === 'my-space'
                    ? await getChildProfilesByOwner(user.uid, true)
                    : await getChildProfilesByFamily(context.id);
                return { contextId: context.id, children };
            });

            const results = await Promise.all(promises);
            results.forEach(res => {
                childrenByContext[res.contextId] = res.children;
            });
            setChildrenByContext(childrenByContext);
            setIsLoadingChildren(false);
        };
        
        fetchChildrenForAllContexts();
    }, [user, availableContexts]);


    const handleSelectChild = (contextId: string, childId: string) => {
        setCurrentContext(contextId);
        setSelectedChildId(childId);
        router.push('/dashboard/heroes');
    };

    const mySpaceContext = availableContexts.find(c => c.id === 'my-space');
    const allianceContexts = availableContexts.filter(c => c.id !== 'my-space');
    
    if (isLoadingChildren || authLoading || familyLoading) {
        return <Loading />;
    }
    
    const renderContextSection = (context: { id: string, name: string }) => {
        const children = childrenByContext[context.id] || [];
        const isMySpace = context.id === 'my-space';
        const Icon = isMySpace ? CircleDot : LinkIcon;
        const name = isMySpace ? 'Cuidar Solo' : `Aliança: ${context.name}`;

        if (children.length === 0) return null;

        return (
             <Card key={context.id} className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        {name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full">
                        <div className="flex space-x-6 pb-4">
                            {children.map(child => (
                                <HeroCard 
                                    key={child.id} 
                                    child={child} 
                                    onClick={() => handleSelectChild(context.id, child.id)}
                                />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {mySpaceContext && renderContextSection(mySpaceContext)}
              {allianceContexts.map(renderContextSection)}
            </div>
            
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-primary" />
                        Gerenciar Espaços
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/cuidando-solo">
                            <CircleDot className="mr-2 h-4 w-4" />
                            Gerenciar "Cuidar Solo"
                        </Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href="/dashboard/alliances">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Gerenciar Alianças
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
