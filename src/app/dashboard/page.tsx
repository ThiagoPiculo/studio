
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from './loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, UserProfile, FamilyRole } from '@/lib/types';
import { getChildProfilesForAttribution, getFamilyMembers } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { cn, getInitials } from '@/lib/utils';
import { Home, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { familyRoles } from "@/lib/types";

interface ContextData {
    context: {
        id: string;
        name: string;
        role?: 'Personal' | FamilyRole;
    };
    children: ChildProfile[];
    members: UserProfile[];
}

function DashboardPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, setCurrentContext, isLoading: isFamilyLoading } = useFamily();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [contextData, setContextData] = useState<ContextData[]>([]);

    const hasChildrenInAnyContext = useMemo(() => contextData.some(cd => cd.children.length > 0), [contextData]);
    const hasAlliances = useMemo(() => availableContexts.length > 1, [availableContexts]);
  
    const fetchData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const dataPromises = availableContexts.map(async (context) => {
                const children = await getChildProfilesForAttribution(user.uid, context.id);
                let members: UserProfile[] = [];
                if (context.id !== 'my-space') {
                    members = await getFamilyMembers(context.id);
                }
                return { context, children, members };
            });

            const allContextData = await Promise.all(dataPromises);
            setContextData(allContextData);
        } catch (error) {
            console.error("Error fetching context data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, availableContexts]);
  
    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
          fetchData();
        }
    }, [fetchData, authLoading, isFamilyLoading]);

    const handleContextClick = (contextId: string) => {
        setCurrentContext(contextId);
        router.push('/dashboard/heroes');
    };

    if (authLoading || isFamilyLoading || isLoading) {
        return <Loading />;
    }
  
    const isNewUserExperience = !hasChildrenInAnyContext && !hasAlliances;

    if (isNewUserExperience) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false}
                hasRewards={false}
            />
        );
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-3">
                        <Home className="h-6 w-6 text-primary" />
                        Visão Geral dos Contextos
                    </CardTitle>
                    <CardDescription>
                        Acesse o painel de um espaço pessoal ou de uma aliança para gerenciar seus heróis.
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contextData.map(({ context, children, members }) => {
                    const Icon = context.id === 'my-space' ? Home : LinkIcon;
                    
                    let description = '';
                    if (context.id === 'my-space') {
                        description = 'Aqui sou proprietário: Tenho controle total para "Cuidar Solo" dos meus Mini Herois. Posso criar aliança e incluir colaboradores para "Cuidarmos Juntos" dos mini herois.';
                    } else if (context.role) {
                        const roleInfo = familyRoles.find(r => r.id === context.role);
                        if (roleInfo) {
                           description = `Aqui sou ${roleInfo.label}: ${roleInfo.description}`;
                        }
                    }

                    return (
                        <Card key={context.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
                                        <CardTitle>{context.name}</CardTitle>
                                    </div>
                                    <Button variant="link" className="p-0 h-auto" onClick={() => handleContextClick(context.id)}>
                                        Ver Espaço <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                                <CardDescription className="pt-1 text-xs">
                                    {description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 flex-grow pt-2">
                                {context.id !== 'my-space' && (
                                   <div>
                                     <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                                     {members.length > 0 ? (
                                        <div className="flex -space-x-2">
                                            {members.map(member => (
                                                <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">Nenhum outro colaborador.</p>
                                    )}
                                   </div>
                                )}
                                <div className={cn(context.id === 'my-space' && 'col-span-2')}>
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Mini Heróis</h4>
                                    {children.length > 0 ? (
                                        <div className="flex -space-x-2">
                                            {children.map(child => (
                                                <Avatar key={child.id} className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={child.avatar} alt={child.name} />
                                                    <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">Nenhum herói neste espaço.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<Loading />}>
            <DashboardPageContent />
        </Suspense>
    );
}
