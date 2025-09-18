
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { Loader2, CircleDot, Link as LinkIcon, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeroContextSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function HeroContextSelectorModal({ isOpen, onOpenChange }: HeroContextSelectorModalProps) {
  const { user } = useAuth();
  const { availableContexts, setCurrentContext, setSelectedChildId } = useFamily();
  const router = useRouter();

  const [childrenByContext, setChildrenByContext] = useState<Record<string, ChildProfile[]>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || availableContexts.length === 0) {
      setIsLoadingChildren(false);
      return;
    }

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
      console.error("Failed to fetch children for modal:", error);
    } finally {
      setIsLoadingChildren(false);
    }
  }, [user, availableContexts]);
  
  useEffect(() => {
    if(isOpen) {
        fetchData();
    }
  }, [isOpen, fetchData]);

  const handleSelectChild = (contextId: string, childId: string) => {
    setCurrentContext(contextId);
    setSelectedChildId(childId);
    // The navigation is now handled by an effect in the FamilyContext
    onOpenChange(false);
  };
  
  const mySpaceContext = availableContexts.find(c => c.id === 'my-space');
  const allianceContexts = availableContexts.filter(c => c.id !== 'my-space');

  const renderContextSection = (context: { id: string; name: string }) => {
    const children = childrenByContext[context.id] || [];
    const Icon = context.id === 'my-space' ? CircleDot : LinkIcon;
    const name = context.id === 'my-space' ? 'Cuidar Solo' : `Aliança: ${context.name}`;

    return (
      <div key={context.id}>
        <h3 className="font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {name}
        </h3>
        {children.length > 0 ? (
          <div className="space-y-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(context.id, child.id)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
              >
                <Avatar
                  className="h-9 w-9 ring-2 ring-offset-background ring-[var(--ring-color)]"
                  style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                >
                  <AvatarImage src={child.avatar} alt={child.name} />
                  <AvatarFallback style={{backgroundColor: child.color}}>
                    {getInitials(child.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">{child.name}</span>
              </button>
            ))}
          </div>
        ) : (
            <p className="text-sm text-muted-foreground italic px-2">Nenhum herói neste espaço.</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolha o Espaço e o Herói</DialogTitle>
          <DialogDescription>
            Selecione um Mini Herói para visualizar esta seção.
          </DialogDescription>
        </DialogHeader>
        {isLoadingChildren ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3">
             {mySpaceContext && renderContextSection(mySpaceContext)}
             {mySpaceContext && allianceContexts.length > 0 && <Separator />}
             {allianceContexts.map(renderContextSection)}

            {(mySpaceContext && childrenByContext['my-space']?.length === 0) && allianceContexts.every(c => childrenByContext[c.id]?.length === 0) && (
              <div className="text-center py-6 text-muted-foreground">
                <UserPlus className="h-10 w-10 mx-auto mb-2 text-primary" />
                <p className='font-semibold'>Nenhum herói cadastrado ainda.</p>
                 <Button variant="link" asChild className="p-0 h-auto font-semibold" onClick={() => onOpenChange(false)}>
                    <Link href="/dashboard/assistente">
                        Use o assistente para criar um!
                    </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
