
"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Loading from './loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, UserProfile, FamilyRole } from '@/lib/types';
import { getChildProfilesForAttribution, getFamilyMembers } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { cn, getInitials } from '@/lib/utils';
import { Home, Link as LinkIcon, ArrowRight, HelpCircle, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { familyRoles } from "@/lib/types";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';


interface ContextData {
    context: {
        id: string;
        name: string;
        role?: 'Personal' | FamilyRole;
    };
    children: ChildProfile[];
    members: UserProfile[];
}

function ContextCard({ contextData, isMobile, viewMode }: { contextData: ContextData, isMobile: boolean, viewMode: 'grid' | 'list' }) {
    const { context, children, members } = contextData;
    const { user } = useAuth();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    const isMySpaceAndEmpty = context.id === 'my-space' && children.length === 0;

    const handleHeaderClick = () => {
        const targetPath = isMySpaceAndEmpty ? '/dashboard' : `/dashboard/heroes`;
        const query = context.id !== 'my-space' ? `?contextId=${context.id}` : '';
        router.push(`${targetPath}${query}`);
    };
    
    const Icon = context.id === 'my-space' ? Home : LinkIcon;
    const roleInfo = context.id === 'my-space' 
      ? { label: 'Proprietário (sem colaboração)', description: 'Seu espaço pessoal para gerenciar os heróis que só você acompanha.' }
      : familyRoles.find(r => r.id === context.role);
    
    const cardHeaderContent = (
         <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground mt-1" />
                <CardTitle className={isMobile ? "text-lg" : ""}>{context.name}</CardTitle>
            </div>
            <Button variant="link" className="p-0 h-auto text-xs sm:text-sm shrink-0" onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }}>
                {isMySpaceAndEmpty ? "Começar a usar" : "Resumo do dia"} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
        </div>
    );

    const mobileHeaderContent = (
      <div className="flex flex-col gap-2 w-full">
          {cardHeaderContent}
          <div className="flex items-center gap-2 pl-8">
              <p className="text-xs text-muted-foreground shrink-0">Mini Heróis:</p>
              <div className="flex items-center -space-x-2 min-w-0">
                  {children.length > 0 ? (
                      children.map(child => (
                          <Avatar key={child.id} className="h-7 w-7 border-2 border-background">
                              <AvatarImage src={child.avatar} alt={child.name} />
                              <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                          </Avatar>
                      ))
                  ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhum herói neste espaço.</p>
                  )}
              </div>
          </div>
      </div>
    );

    const expandedContent = (
      <div className="space-y-4 pt-4 border-t">
          <div className="space-y-1">
              <p className="font-semibold text-foreground/90">{roleInfo?.label}</p>
              <p className="text-xs text-muted-foreground">{roleInfo?.description}</p>
          </div>
          {context.id !== 'my-space' && (
              <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Colaboradores:</h4>
                  {members.length > 1 ? (
                      <div className="flex -space-x-2">
                          {members.filter(m => m.uid !== user?.uid).map(member => (
                              <Avatar key={member.uid} className="h-7 w-7 border-2 border-background">
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
      </div>
    );
    
    if (isMobile) {
        return (
            <div className="border bg-card rounded-lg shadow-sm p-4 space-y-2">
                {mobileHeaderContent}
                {isExpanded && <div className="animate-accordion-down">{expandedContent}</div>}
                 <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1 pt-2"
                >
                    {isExpanded ? "Ver menos" : "Ver mais"}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </button>
            </div>
        );
    }
    
    if (viewMode === 'list') {
        return (
             <Card key={context.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center">
                <CardHeader className="flex-1 p-4 md:p-6">
                   {cardHeaderContent}
                   <CardDescription className="pt-1 text-xs">{roleInfo?.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-4 grid grid-cols-2 gap-4 flex-shrink-0 md:border-l">
                     {context.id !== 'my-space' && (
                       <div>
                         <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                         {members.length > 1 ? (
                            <div className="flex -space-x-2">
                                {members.filter(m => m.uid !== user?.uid).map(member => (
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
                            <p className="text-xs text-muted-foreground italic">Nenhum herói aqui.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card key={context.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader>
               {cardHeaderContent}
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="grid gap-4 flex-grow pt-2">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{roleInfo?.description}</p>
                </div>
                {context.id !== 'my-space' && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                        {members.length > 1 ? (
                        <div className="flex -space-x-2">
                           {members.filter(m => m.uid !== user?.uid).map(member => (
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
              </div>
            </CardContent>
        </Card>
    );
};

let viewMode: 'grid' | 'list' = 'grid'; // Define outside to persist across re-renders without state

function DashboardRootPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: isFamilyLoading } = useFamily();
    const router = useRouter();
    const isMobile = useIsMobile();
    
    const [localViewMode, setLocalViewMode] = useState(viewMode);
    const [isLoading, setIsLoading] = useState(true);
    const [contextData, setContextData] = useState<ContextData[]>([]);

    const defaultOpenAccordionItems = useMemo(() => {
        return contextData
            .filter(cd => cd.context.id !== 'my-space')
            .map(cd => cd.context.id);
    }, [contextData]);

    useEffect(() => {
        viewMode = localViewMode;
    }, [localViewMode]);

    const hasAlliances = useMemo(() => availableContexts.length > 1, [availableContexts]);

    const mySpaceData = useMemo(() => {
        return contextData.find(cd => cd.context.id === 'my-space');
    }, [contextData]);

    const mySpaceIsEmptyButHasAlliances = useMemo(() => {
        return mySpaceData?.children.length === 0 && hasAlliances;
    }, [mySpaceData, hasAlliances]);

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
                } else {
                    if (user) {
                        members = [user as UserProfile];
                    }
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
    
    const isNewUserExperience = !isLoading && !authLoading && !isFamilyLoading && mySpaceData?.children.length === 0 && !hasAlliances;
    
    if (authLoading || isFamilyLoading || isLoading) {
        return <Loading />;
    }
  
    if (isNewUserExperience) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false}
                hasRewards={false}
            />
        );
    }
    
    const renderContent = () => {
        const mySpaceContext = contextData.find(cd => cd.context.id === 'my-space');
        const allianceContexts = contextData.filter(cd => cd.context.id !== 'my-space');

        if (isMobile) {
            return (
                <div className="space-y-4">
                    {mySpaceContext && <ContextCard key={mySpaceContext.context.id} contextData={mySpaceContext} isMobile={true} viewMode={localViewMode} />}
                    {allianceContexts.map(cd => (
                        <ContextCard key={cd.context.id} contextData={cd} isMobile={true} viewMode={localViewMode}/>
                    ))}
                    {mySpaceIsEmptyButHasAlliances && (
                        <div className="pt-4">
                           <GettingStartedGuide hasChildren={false} hasMissions={false} hasRewards={false} />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-6",
                localViewMode === 'list' && "grid-cols-1"
            )}>
                 {mySpaceContext && <ContextCard contextData={mySpaceContext} isMobile={false} viewMode={localViewMode} />}
                 {mySpaceIsEmptyButHasAlliances && (
                     <div className="md:col-span-2">
                        <GettingStartedGuide hasChildren={false} hasMissions={false} hasRewards={false} />
                     </div>
                 )}
                 {allianceContexts.map(cd => <ContextCard key={cd.context.id} contextData={cd} isMobile={false} viewMode={localViewMode} />)}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-2 items-start justify-between">
                <div className="flex items-center gap-2">
                    <Home className="h-8 w-8 text-primary" />
                     <div>
                        <h2 className="text-3xl font-headline font-bold">Visão Geral dos Espaços</h2>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-3">
                                <h4 className="font-medium leading-none">Seu Ponto de Partida Estratégico</h4>
                                <p className="text-sm text-muted-foreground">
                                    Esta tela é sua central de comando, oferecendo uma visão geral de todos os seus espaços de trabalho.
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                                    <li><strong>Meu Espaço:</strong> Seu ambiente privado para gerenciar os heróis que só você acompanha. Ideal para missões e recompensas pessoais.</li>
                                    <li><strong>Alianças:</strong> Espaços compartilhados onde você colabora com outros responsáveis (como co-pais, avós ou terapeutas). As missões, recompensas e heróis aqui são visíveis a todos os membros da aliança.</li>
                                </ul>
                                <p className="text-sm text-muted-foreground">
                                    Clique em um card para mergulhar no universo daquele espaço e começar a gerenciar o progresso dos heróis.
                                </p>
                                <PopoverClose asChild>
                                    <Button className="w-full">Entendi 👍</Button>
                                </PopoverClose>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                 {!isMobile && (
                     <ToggleGroup type="single" value={localViewMode} onValueChange={(value) => value && setLocalViewMode(value as any)} className="w-full sm:w-auto">
                        <ToggleGroupItem value="grid" aria-label="Ver em grade" className="flex-1 sm:flex-initial">
                            <LayoutGrid className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="list" aria-label="Ver em lista" className="flex-1 sm:flex-initial">
                            <List className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                 )}
            </div>
            {renderContent()}
        </div>
    );
}

export default function DashboardRootPage() {
    return (
        <Suspense fallback={<Loading />}>
            <DashboardRootPageContent />
        </Suspense>
    );
}
