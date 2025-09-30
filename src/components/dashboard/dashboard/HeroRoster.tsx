
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile } from '@/lib/types';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function HeroRoster() {
    const { user } = useAuth();
    const { availableContexts, setSelectedChildId, setCurrentContext } = useFamily();
    const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user || availableContexts.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchAllChildren = async () => {
            setIsLoading(true);
            try {
                const childrenPromises = availableContexts.map(context => 
                    getChildProfilesForAttribution(user.uid, context.id)
                );
                const childrenByContext = await Promise.all(childrenPromises);
                const flattenedChildren = childrenByContext.flat().sort((a,b) => a.name.localeCompare(b.name));
                
                const uniqueChildren = Array.from(new Map(flattenedChildren.map(child => [child.id, child])).values());
                
                setAllChildren(uniqueChildren);
            } catch (error) {
                console.error("Failed to fetch all children for roster:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllChildren();
    }, [user, availableContexts]);
    
    const handleHeroClick = (child: ChildProfile) => {
        const contextId = child.familyId || 'my-space';
        setCurrentContext(contextId);
        setSelectedChildId(child.id);
        router.push('/dashboard/heroes');
    };
    
    const renderHeroButton = (child: ChildProfile) => (
        <button key={child.id} onClick={() => handleHeroClick(child)} className="flex flex-col items-center gap-2 text-center group w-20">
            <Avatar className="w-16 h-16 text-2xl border-4 shadow-md transition-transform group-hover:scale-105" style={{ borderColor: child.color }}>
                <AvatarImage src={child.avatar} alt={child.name} />
                <AvatarFallback className="font-bold" style={{ backgroundColor: child.color }}>
                    {getInitials(child.name)}
                </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold truncate w-full group-hover:text-primary">{child.name}</p>
        </button>
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Meus Mini Heróis</CardTitle>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/assistente">
                        <PlusCircle className="mr-2 h-4 w-4" /> Novo Herói
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : allChildren.length === 0 ? (
                     <div className="text-center py-4 text-muted-foreground">
                        <p>Nenhum herói cadastrado ainda.</p>
                     </div>
                ) : (
                    <ScrollArea>
                        <div className="flex space-x-6 pb-4">
                            {allChildren.map(renderHeroButton)}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
