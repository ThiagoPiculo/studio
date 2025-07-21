
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplateById, 
  updateMissionTemplate,
  getMissionInstancesForContext,
  getChildProfilesForAttribution,
} from '@/lib/firebase/firestore';
import type { MissionCategory, MissionTemplate, ChildProfile, MissionInstance } from '@/lib/types';
import { missionCategories } from '@/lib/types'; 
import { Loader2, Target, Save, ArrowLeft, Star as StarIcon, BadgeCheck, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRole } from '@/hooks/useUserRole';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';

const missionTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  emoji: z.string().max(4, { message: "O emoji deve ter no máximo 4 caracteres." }).optional().default(''),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<MissionCategory>((val) => missionCategories.map(rc => rc.id).includes(val as MissionCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 estrelas."}),
  xpReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 XP."}),
  status: z.enum(['active', 'archived']).default('active'),
});

type MissionTemplateFormValues = z.infer<typeof missionTemplateFormSchema>;

export default function EditMissionTemplatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const missionId = params.missionId as string;
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { canEdit, isLoading: isRoleLoading } = useUserRole();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [missionTemplate, setMissionTemplate] = useState<MissionTemplate | null>(null);
  
  const [assignedChildren, setAssignedChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [instanceToEdit, setInstanceToEdit] = useState<MissionInstance | null>(null);

  const form = useForm<MissionTemplateFormValues>({
    resolver: zodResolver(missionTemplateFormSchema),
    defaultValues: {
      title: '',
      emoji: '',
      description: '',
      category: undefined, 
      starsReward: 5,
      xpReward: 10,
      status: 'active',
    },
  });

  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  const fetchMissionData = async () => {
    if (!missionId || !user) {
      setIsFetchingData(false);
      if(!user) router.push('/auth/login');
      else router.push('/dashboard/missions');
      return;
    }

    setIsFetchingData(true);
    setIsLoadingAssignments(true);

    try {
      const fetchedTemplate = await getMissionTemplateById(missionId);
      if (fetchedTemplate) {
        setMissionTemplate(fetchedTemplate);
        form.reset({
          title: fetchedTemplate.title,
          emoji: fetchedTemplate.emoji || '',
          description: fetchedTemplate.description || '',
          category: fetchedTemplate.category,
          starsReward: fetchedTemplate.starsReward,
          xpReward: fetchedTemplate.xpReward,
          status: fetchedTemplate.status,
        });

        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [allChildren, allInstances] = await Promise.all([
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionInstancesForContext(user.uid, familyIdToQuery)
        ]);
        
        setMissionInstances(allInstances);

        const childrenMap = new Map(allChildren.map(child => [child.id, child]));
        const assignedChildIds = new Set<string>();
        allInstances.forEach(instance => {
            if (instance.templateId === missionId) {
                assignedChildIds.add(instance.childId);
            }
        });
        
        const childrenWithAssignment = Array.from(assignedChildIds)
            .map(childId => childrenMap.get(childId))
            .filter((child): child is ChildProfile => !!child)
            .sort((a,b) => a.name.localeCompare(b.name));
            
        setAssignedChildren(childrenWithAssignment);
      } else {
        toast({ title: "Missão não encontrada", variant: "destructive" });
        router.push('/dashboard/missions');
      }
    } catch (error) {
      console.error("Error fetching mission data:", error);
      toast({ title: "Erro ao carregar missão", variant: "destructive" });
      router.push('/dashboard/missions');
    } finally {
      setIsFetchingData(false);
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchMissionData();
  }, [missionId, user, currentContext]);

  const handleOpenEditDialog = (child: ChildProfile) => {
    const instance = missionInstances.find(inst => inst.templateId === missionId && inst.childId === child.id);
    if (instance) {
      setInstanceToEdit(instance);
      setIsAssignDialogOpen(true);
    } else {
      toast({ title: 'Atribuição não encontrada', description: 'Não foi possível encontrar a atribuição para este herói.', variant: 'destructive' });
    }
  };

  const onSubmit = async (values: MissionTemplateFormValues) => {
    if (!user || !missionTemplate) {
      toast({ title: "Erro de Autenticação ou Dados", description: "Não foi possível salvar.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const updatePayload: Partial<Omit<MissionTemplate, 'id' | 'createdAt' | 'ownerId'| 'familyId' | 'isRecurring' | 'startDate' | 'dueDate' | 'recurrenceRule'>> = {
          title: values.title,
          emoji: values.emoji,
          description: values.description,
          category: values.category,
          starsReward: values.starsReward,
          xpReward: values.xpReward,
          status: values.status,
      };

      await updateMissionTemplate(user, missionTemplate.id, updatePayload);

      toast({
        title: 'Missão Atualizada!',
        description: `A missão "${values.title}" foi atualizada com sucesso.`,
      });
      router.push('/dashboard/missions'); 
    } catch (error) {
      console.error('Error updating mission template:', error);
      toast({
        title: 'Erro ao Atualizar Missão',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData || isRoleLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3">Carregando dados da missão...</p>
      </div>
    );
  }

  if (!missionTemplate) {
     return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-lg text-destructive mb-4">Missão não encontrada.</p>
        <Button onClick={() => router.push('/dashboard/missions')}>Voltar para a Central</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex items-center gap-3 mb-2">
            <Target className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Editar Missão</CardTitle>
              <CardDescription className="text-md">
                Modifique os detalhes desta missão no catálogo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <fieldset disabled={!canEdit} className="space-y-8 group">
                <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="emoji"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emoji</FormLabel>
                          <FormControl>
                            <Input className="w-16 h-10 text-center text-xl p-0" maxLength={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título da Missão</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Arrumar a cama" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {missionCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center">
                                  {category.icon && <category.icon className={`mr-2 h-4 w-4 ${category.colorClasses.split(" ")[1]}`} />}
                                  <span>{category.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="starsReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><StarIcon className="text-yellow-500"/> Recompensa em Estrelas</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="xpReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><BadgeCheck className="text-blue-500" /> Recompensa em XP</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes sobre a missão."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status da Missão</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status da missão..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativa (pode ser atribuída)</SelectItem>
                          <SelectItem value="archived">Arquivada (não pode ser atribuída)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Missões ativas podem ser atribuídas a crianças. Missões arquivadas não aparecerão para novas atribuições.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {canEdit && (
                  <div className="flex items-center justify-end gap-2 border-t pt-6">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || isFetchingData}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="mt-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Em Uso Por
          </CardTitle>
          <CardDescription>
              Esta missão está atualmente atribuída aos seguintes heróis. Para editar o agendamento de um herói, use o botão de gerenciamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAssignments ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando atribuições...</span>
            </div>
          ) : assignedChildren.length === 0 ? (
            <p className="text-muted-foreground text-sm">Esta missão não está atribuída a nenhum herói no momento.</p>
          ) : (
            <div className="space-y-3">
              {assignedChildren.map(child => (
                <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                      <Avatar
                        className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)]"
                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                      >
                          <AvatarImage src={child.avatar} alt={child.name} />
                          <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                              {getInitials(child.name)}
                          </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{child.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(child)}>
                      Gerenciar Agendamento <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignMissionDialog
        template={null}
        instanceToEdit={instanceToEdit}
        isOpen={isAssignDialogOpen}
        onOpenChange={(isOpen) => {
          setIsAssignDialogOpen(isOpen);
          if (!isOpen) {
            setInstanceToEdit(null);
          }
        }}
        onAssigned={() => {
          fetchMissionData(); // Re-fetch all data to ensure UI is up-to-date
        }}
      />

    </div>
  );
}
