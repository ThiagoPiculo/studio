"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, MissionInstance } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { 
  getMissionTemplatesByOwnerOrFamily,
  getChildProfilesForAttribution,
  getMissionInstancesForContext
} from '@/lib/firebase/firestore';
import { Loader2, PackageSearch, PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SelectMissionTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMissionSelected: (template: MissionTemplate) => void;
}

export function SelectMissionTemplateDialog({ isOpen, onOpenChange, onMissionSelected }: SelectMissionTemplateDialogProps) {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      const fetchAllData = async () => {
        try {
          const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
          const [templates, children, instances] = await Promise.all([
            getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, familyIdToQuery)
          ]);
          const activeTemplates = templates.filter(t => t.status === 'active');
          setMissionTemplates(activeTemplates);
          setChildren(children);
          setMissionInstances(instances.filter(i => i.status === 'pending'));
        } catch (error) {
          console.error("Error fetching data for mission selection:", error);
          toast({ title: "Erro ao Carregar Catálogo", description: "Não foi possível buscar os dados de missões.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllData();
    }
  }, [isOpen, user, currentContext, toast]);

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const assignmentsByTemplate = useMemo(() => {
    const assignments = new Map<string, ChildProfile[]>();
    missionInstances.forEach(instance => {
      const child = childrenMap.get(instance.childId);
      if (child) {
        const existing = assignments.get(instance.templateId) || [];
        if (!existing.find(c => c.id === child.id)) {
          assignments.set(instance.templateId, [...existing, child]);
        }
      }
    });
    return assignments;
  }, [missionInstances, childrenMap]);
  
  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'MH';
  
  const getCategoryDetails = (categoryId: MissionTemplate['category']): MissionCategoryDetails | undefined => {
    return missionCategories.find(cat => cat.id === categoryId);
  };

  const handleSelect = (template: MissionTemplate) => {
    onMissionSelected(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Adicionar Missão à Agenda</DialogTitle>
          <DialogDescription>Selecione uma missão do seu catálogo para atribuir ou crie uma nova.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Carregando missões...</p>
          </div>
        ) : missionTemplates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <PackageSearch className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p className='font-semibold'>Nenhuma missão ativa no catálogo.</p>
            <p className="text-sm">Clique no botão abaixo para criar sua primeira missão.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] mt-2 pr-3">
            <div className="space-y-2">
              {missionTemplates.map(template => {
                 const categoryDetails = getCategoryDetails(template.category);
                 const CategoryIconComponent = categoryDetails?.icon;
                 const assignedChildren = assignmentsByTemplate.get(template.id) || [];
                return (
                    <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className="w-full text-left p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors flex flex-col"
                    >
                        <p className="font-semibold">{template.title}</p>
                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                                {categoryDetails && (
                                    <div className="flex items-center gap-1">
                                        {CategoryIconComponent && <CategoryIconComponent className={`h-3.5 w-3.5 text-muted-foreground`} />}
                                        <span className={`text-xs text-muted-foreground`}>
                                        {categoryDetails.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {template.starsReward} ★ / {template.xpReward} XP
                            </p>
                        </div>
                        {assignedChildren.length > 0 && (
                          <div className="border-t pt-2 mt-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Ativo para:</span>
                              <div className="flex -space-x-2">
                              {assignedChildren.slice(0, 5).map(child => (
                                  <TooltipProvider key={child.id} delayDuration={100}>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                          <Avatar
                                              className="h-6 w-6 border-2 border-background ring-1 ring-offset-background ring-[var(--ring-color)]"
                                              style={{ '--ring-color': child.color } as React.CSSProperties}
                                          >
                                              <AvatarImage src={child.avatar} alt={child.name} />
                                              <AvatarFallback
                                                  className="text-xs"
                                                  style={{ backgroundColor: child.color }}
                                              >
                                                  {getInitials(child.name)}
                                              </AvatarFallback>
                                          </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                          <p>{child.name}</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                              ))}
                              </div>
                              {assignedChildren.length > 5 && (
                                  <span className="text-xs font-medium text-muted-foreground">
                                      + {assignedChildren.length - 5}
                                  </span>
                              )}
                          </div>
                        )}
                    </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="mt-4 pt-4 border-t">
          <Link href="/dashboard/missions/new" className="w-full">
            <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Missão no Catálogo
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
