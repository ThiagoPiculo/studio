"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile } from '@/lib/types';
import { getChildProfilesByAttribution } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

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
                    getChildProfilesByAttribution(user.uid, context.id)
                );
                const childrenByContext = await Promise.all(childrenPromises);
                const flattenedChildren = childrenByContext.flat().sort((a,b) => a.name.localeCompare(b.name));
                
                // Remove duplicates in case a child is in multiple contexts (should not happen with current logic, but as a safeguard)
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Meus Mini Heróis</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea>
                        <div className="flex space-x-6 pb-4">
                            <Link href="/dashboard/assistente" className="flex flex-col items-center gap-2 w-20 text-center">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center bg-muted/50 hover:bg-accent hover:border-primary transition-colors">
                                    <PlusCircle className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-semibold text-muted-foreground">Novo Herói</p>
                            </Link>

                            {allChildren.map(child => (
                                <button key={child.id} onClick={() => handleHeroClick(child)} className="flex flex-col items-center gap-2 w-20 text-center">
                                    <Avatar className="w-16 h-16 text-2xl border-4 shadow-md transition-transform hover:scale-105" style={{ borderColor: child.color }}>
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback className="font-bold" style={{ backgroundColor: child.color }}>
                                            {getInitials(child.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-semibold truncate w-full">{child.name}</p>
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
