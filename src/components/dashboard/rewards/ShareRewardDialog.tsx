
"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { RewardTemplate } from '@/lib/types';
import { addRewardTemplate, getRewardTemplatesByOwnerOrFamily } from '@/lib/supabase/db';
import { Loader2, Share2, CircleDot, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShareRewardDialogProps {
  template: RewardTemplate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onShared?: () => void;
}

export function ShareRewardDialog({ template, isOpen, onOpenChange, onShared }: ShareRewardDialogProps) {
  const { user } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();

  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingTemplatesMap, setExistingTemplatesMap] = useState<Map<string, boolean>>(new Map());
  const [isLoadingData, setIsLoadingData] = useState(true);

  const shareableContexts = useMemo(() => {
    if (!template) return [];
    const sourceContextId = template.familyId || 'my-space';
    return availableContexts.filter(c => c.id !== sourceContextId);
  }, [availableContexts, template]);
  
  useEffect(() => {
    if (isOpen && user && template) {
        setIsLoadingData(true);
        const fetchAllTemplates = async () => {
            try {
                const templatesMap = new Map<string, boolean>();
                for (const context of shareableContexts) {
                    const familyIdToQuery = context.id === 'my-space' ? null : context.id;
                    const templates = await getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
                    const hasExisting = templates.some(t => t.title.trim().toLowerCase() === template.title.trim().toLowerCase());
                    templatesMap.set(context.id, hasExisting);
                }
                setExistingTemplatesMap(templatesMap);
            } catch (error) {
                console.error("Error checking for existing templates:", error);
                toast({ title: "Erro ao verificar recompensas", variant: "destructive" });
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchAllTemplates();
    } else {
        setSelectedContexts([]); // Reset selection when dialog closes
    }
  }, [isOpen, user, template, shareableContexts, toast]);

  const getContextName = (contextId: string) => {
    if (contextId === 'my-space') return "Seu Espaço (Cuidar Solo)";
    const context = availableContexts.find(c => c.id === contextId);
    return context ? `Aliança: "${context.name}"` : 'Espaço Desconhecido';
  };

  const IconForContext = ({ contextId }: { contextId: string }) => {
    return contextId === 'my-space' ? <CircleDot className="h-4 w-4 text-chart-2" /> : <LinkIcon className="h-4 w-4 text-chart-4" />;
  };

  const handleContextSelection = (contextId: string, isSelected: boolean) => {
    setSelectedContexts(prev =>
      isSelected ? [...prev, contextId] : prev.filter(id => id !== contextId)
    );
  };

  const handleShare = async () => {
    if (!template || !user || selectedContexts.length === 0) {
      toast({ title: "Nenhum destino selecionado.", variant: "default" });
      return;
    }

    setIsProcessing(true);
    try {
      const templateData: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'familyId'> = {
        ownerId: user.uid, // The user sharing becomes the owner in the new context
        title: template.title,
        description: template.description,
        category: template.category,
        starsCost: template.starsCost,
        isMaterial: template.isMaterial,
        isUnique: template.isUnique,
        source: 'custom', // Copied items are always custom
        justification: template.justification,
        tip: template.tip,
      };

      await addRewardTemplate(user, templateData, selectedContexts);

      toast({
        title: "Recompensa Compartilhada!",
        description: `"${template.title}" foi copiada para ${selectedContexts.length} espaço(s) de trabalho.`,
      });
      onShared?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sharing reward template:", error);
      toast({ title: "Erro ao Compartilhar", description: "Não foi possível copiar a recompensa.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Compartilhar Recompensa</DialogTitle>
          <DialogDescription>
            Copie a recompensa "<span className="font-semibold text-primary">{template.title}</span>" para outros espaços de trabalho.
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingData ? (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             </div>
        ) : shareableContexts.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
                Você não tem outros espaços de trabalho para compartilhar esta recompensa.
            </div>
        ) : (
            <div className="space-y-3 py-2">
                <Label>Selecione os destinos:</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                   {shareableContexts.map(context => {
                      const alreadyExists = existingTemplatesMap.get(context.id);
                      return (
                        <div 
                          key={context.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                        >
                           <Label 
                                htmlFor={`share-context-${context.id}`} 
                                className="flex-1 cursor-pointer flex items-center gap-2"
                            >
                              <IconForContext contextId={context.id} />
                              {getContextName(context.id)}
                           </Label>
                           {alreadyExists ? (
                             <Badge variant="outline">Já existe</Badge>
                           ) : (
                             <Checkbox
                                id={`share-context-${context.id}`}
                                checked={selectedContexts.includes(context.id)}
                                onCheckedChange={(checked) => handleContextSelection(context.id, !!checked)}
                             />
                           )}
                        </div>
                      )
                   })}
                </ScrollArea>
            </div>
        )}

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleShare} disabled={isProcessing || selectedContexts.length === 0 || isLoadingData}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Confirmar Cópia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
