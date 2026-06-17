
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile } from '@/lib/types';
import { getChildProfilesForAttribution } from '@/lib/supabase/db';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, ChevronDown } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function HeroRoster() {
    const { user } = useAuth();
    const { availableContexts, selectHeroAndNavigate } = useFamily();
    const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isMobile = useIsMobile();

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
    
    const renderHeroButton = (child: ChildProfile) => (
        <button key={child.id} onClick={() => selectHeroAndNavigate(child.id, child.familyId || 'my-space', '/dashboard/heroes')} className="flex flex-col items-center gap-2 text-center group w-20">
            <Avatar className="w-16 h-16 text-2xl border-4 shadow-md transition-transform group-hover:scale-105" style={{ borderColor: child.color }}>
                <AvatarImage src={child.avatar} alt={child.name} />
                <AvatarFallback className="font-bold" style={{ backgroundColor: child.color }}>
                    {getInitials(child.name)}
                </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold truncate w-full group-hover:text-primary">{child.name}</p>
        </button>
    );

    const renderMobileView = () => {
        const visibleHeroes = allChildren.slice(0, 4);
        const hiddenHeroes = allChildren.slice(4);

        return (
            <Accordion type="single" collapsible className="w-full" disabled={hiddenHeroes.length === 0}>
                <AccordionItem value="item-1" className="border-none">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-4 gap-3">
                            {visibleHeroes.map(renderHeroButton)}
                        </div>
                    </CardContent>
                    {hiddenHeroes.length > 0 && (
                        <AccordionContent className="p-4 pt-0">
                            <div className="grid grid-cols-4 gap-3 pt-4 border-t">
                                {hiddenHeroes.map(renderHeroButton)}
                            </div>
                        </AccordionContent>
                    )}
                    {hiddenHeroes.length > 0 && (
                        <CardFooter className="p-2">
                             <AccordionTrigger className="w-full text-sm text-muted-foreground hover:text-primary">
                                Ver todos os {allChildren.length} heróis
                             </AccordionTrigger>
                        </CardFooter>
                    )}
                </AccordionItem>
            </Accordion>
        );
    };

    const renderDesktopView = () => (
         <CardContent>
            <ScrollArea>
                <div className="flex space-x-6 pb-4">
                    {allChildren.map(renderHeroButton)}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
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
            {isLoading ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : allChildren.length === 0 ? (
                 <CardContent>
                    <div className="text-center py-4 text-muted-foreground">
                        <p>Nenhum herói cadastrado ainda.</p>
                    </div>
                </CardContent>
            ) : (
                isMobile ? renderMobileView() : renderDesktopView()
            )}
        </Card>
    );
}
