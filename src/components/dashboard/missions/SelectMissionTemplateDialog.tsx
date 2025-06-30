
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { MissionTemplate, MissionCategoryDetails } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { getMissionTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { Loader2, PackageSearch, PlusCircle } from 'lucide-react';
import Link from 'next/link';

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      const fetchTemplates = async () => {
        try {
          const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
          const templates = await getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
          const activeTemplates = templates.filter(t => t.status === 'active');
          setMissionTemplates(activeTemplates);
        } catch (error) {
          console.error("Error fetching mission templates:", error);
          toast({ title: "Erro ao Carregar Catálogo", description: "Não foi possível buscar as missões disponíveis.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [isOpen, user, currentContext, toast]);
  
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
          <DialogDescription>Selecione uma missão do seu catálogo para atribuir.</DialogDescription>
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
            <p className="text-sm">Vá para a Central de Missões para criar uma.</p>
            <Link href="/dashboard/missions/new">
                <Button variant="link" className="p-0 h-auto mt-2" onClick={() => onOpenChange(false)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar nova missão
                </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] mt-2 pr-3">
            <div className="space-y-2">
              {missionTemplates.map(template => {
                 const categoryDetails = getCategoryDetails(template.category);
                 const CategoryIconComponent = categoryDetails?.icon;
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
                    </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
