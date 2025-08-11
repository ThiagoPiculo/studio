
"use client";
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Home, ChevronsUpDown, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';


export function FamilyContextSwitcher() {
  const { currentContext, setCurrentContext, availableContexts, isLoading: isFamilyLoading } = useFamily();
  const { user } = useAuth();
  const [childrenByContext, setChildrenByContext] = useState<Record<string, ChildProfile[]>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  useEffect(() => {
    if (!user || availableContexts.length === 0) {
      setIsLoadingChildren(false);
      return;
    }

    const fetchAllChildren = async () => {
        setIsLoadingChildren(true);
        const childrenData: Record<string, ChildProfile[]> = {};
        const promises = availableContexts.map(async (context) => {
            const children = await getChildProfilesForAttribution(user.uid, context.id);
            childrenData[context.id] = children;
        });

        try {
            await Promise.all(promises);
            setChildrenByContext(childrenData);
        } catch (error) {
            console.error("Failed to fetch children for context switcher:", error);
        } finally {
            setIsLoadingChildren(false);
        }
    };
    
    fetchAllChildren();
  }, [user, availableContexts]);


  const handleContextChange = (value: string) => {
    setCurrentContext(value);
  };
  
  const currentContextData = availableContexts.find(c => c.id === currentContext);
  const currentChildren = childrenByContext[currentContext] || [];

  if (!user || availableContexts.length <= 1) return null;
  
  if (isFamilyLoading) {
    return (
      <Button variant="secondary" className="w-[240px] justify-start h-auto p-2" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
      </Button>
    );
  }

  const getDisplayName = (context?: { id: string; name: string }) => {
    if (!context) return "Carregando...";
    if (context.id === 'my-space') return context.name;
    return context.name;
  }

  const Icon = currentContext === 'my-space' ? Home : LinkIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="w-full max-w-[240px] justify-between h-auto p-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-semibold truncate">{getDisplayName(currentContextData)}</span>
            </div>
            <div className="flex items-center justify-between w-full pl-6 mt-1">
                 <div className="flex items-center -space-x-2 min-w-0">
                    {isLoadingChildren ? (
                        <Skeleton className="h-6 w-24 rounded-full" />
                    ) : currentChildren.length > 0 ? (
                        <>
                            {currentChildren.slice(0, 5).map(child => (
                                <Avatar key={child.id} className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                </Avatar>
                            ))}
                             {currentChildren.length > 5 && (
                                <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">+{currentChildren.length - 5}</AvatarFallback>
                                </Avatar>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhum Mini Heroi</span>
                    )}
                 </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="start">
        <DropdownMenuLabel>Espaços que Acesso</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableContexts.map((context) => {
            const childrenInContext = childrenByContext[context.id];
            const isSelected = context.id === currentContext;
            return (
                <DropdownMenuItem key={context.id} onSelect={() => handleContextChange(context.id)} className={cn("cursor-pointer h-auto py-2 data-[highlighted]:bg-accent/50", isSelected && "bg-accent/50")}>
                    <div className="flex flex-col gap-1.5 w-full">
                       <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {context.id === 'my-space' ? <Home className="h-4 w-4" /> : <LinkIcon className="h-4 w-4 text-chart-4" />}
                                <span className="font-medium truncate">{getDisplayName(context)}</span>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="pl-6 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Mini Herois:</span>
                            {isLoadingChildren ? (
                                <Skeleton className="h-6 w-20 rounded-full" />
                            ) : (
                                <div className="flex -space-x-2">
                                {childrenInContext && childrenInContext.length > 0 ? (
                                    childrenInContext.slice(0, 4).map(child => (
                                        <Avatar key={child.id} className="h-6 w-6 border-2 border-background">
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                    ))
                                ) : (
                                    <span className="text-xs italic text-muted-foreground">Nenhum</span>
                                )}
                                {childrenInContext && childrenInContext.length > 4 && (
                                     <Avatar className="h-6 w-6 border-2 border-background">
                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">+{childrenInContext.length - 4}</AvatarFallback>
                                     </Avatar>
                                )}
                                </div>
                            )}
                        </div>
                    </div>
                </DropdownMenuItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
