
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
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';


export function FamilyContextSwitcher() {
  const { currentContext, setCurrentContext, availableContexts, isLoading: isFamilyLoading } = useFamily();
  const { user } = useAuth();
  const [childrenByContext, setChildrenByContext] = useState<Record<string, ChildProfile[]>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  // Refs and state for dynamic avatar calculation
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visibleAvatars, setVisibleAvatars] = useState(0);

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
  
  const calculateVisibleAvatars = useCallback(() => {
    if (isLoadingChildren || !triggerRef.current || !contentRef.current) {
        if(currentChildren.length > 0) setVisibleAvatars(currentChildren.length);
        return;
    };
    
    const GAP = 4; // gap-1 in flex = 4px
    const AVATAR_WIDTH = 28; // h-7 w-7 = 28px
    const COUNTER_WIDTH = 28; // width for the "+N" avatar

    const triggerWidth = triggerRef.current.offsetWidth;
    const contentWidth = contentRef.current.offsetWidth;
    const availableSpace = triggerWidth - contentWidth - GAP;
    
    let maxAvatars = Math.floor(availableSpace / (AVATAR_WIDTH - 8)); // -8 for negative space-x-2 overlap
    
    if (currentChildren.length > maxAvatars) {
        const spaceWithCounter = availableSpace - (COUNTER_WIDTH - 8);
        maxAvatars = Math.floor(spaceWithCounter / (AVATAR_WIDTH - 8));
    }
    
    setVisibleAvatars(Math.max(0, maxAvatars));
  }, [isLoadingChildren, currentChildren.length]);

  useEffect(() => {
    calculateVisibleAvatars();
    window.addEventListener('resize', calculateVisibleAvatars);
    return () => window.removeEventListener('resize', calculateVisibleAvatars);
  }, [calculateVisibleAvatars]);

  if (!user || availableContexts.length <= 1) return null;
  
  if (isFamilyLoading) {
    return (
      <Button variant="secondary" className="w-[240px] justify-start h-10 p-2" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
      </Button>
    );
  }

  const getDisplayName = (context?: { id: string; name: string }) => {
    if (!context) return "Carregando...";
    if (context.id === 'my-space') return context.name;
    return `Aliança: ${context.name}`;
  }

  const Icon = currentContext === 'my-space' ? Home : LinkIcon;
  const showCounter = currentChildren.length > visibleAvatars;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" ref={triggerRef} className="w-full max-w-[320px] h-10 justify-between p-2">
            <div ref={contentRef} className="flex items-center gap-2 overflow-hidden">
                <Icon className="h-5 w-5 shrink-0" />
                <span className="font-semibold truncate">{getDisplayName(currentContextData)}</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="flex items-center -space-x-2 min-w-0">
                    {isLoadingChildren ? (
                        <Skeleton className="h-7 w-20 rounded-full" />
                    ) : currentChildren.length > 0 ? (
                        <>
                            {currentChildren.slice(0, visibleAvatars).map(child => (
                                <Avatar key={child.id} className="h-7 w-7 border-2 border-background">
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                </Avatar>
                            ))}
                             {showCounter && (
                                <Avatar className="h-7 w-7 border-2 border-background">
                                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">+{currentChildren.length - visibleAvatars}</AvatarFallback>
                                </Avatar>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground italic pr-1">Nenhum Mini Heroi</span>
                    )}
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
        <DropdownMenuLabel>Sua Missão Atual:</DropdownMenuLabel>
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
