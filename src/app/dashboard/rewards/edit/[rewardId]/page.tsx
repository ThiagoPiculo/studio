
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updateReward, getRewardById, getChildProfileById } from '@/lib/firebase/firestore';
import type { RewardCategory, Reward, ChildProfile } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, Gift, Save, ArrowLeft } from 'lucide-react';

const rewardFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional(),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
  // childId não é editável, mas pode ser necessário no schema se você o incluísse no formulário de alguma forma
});

type RewardFormValues = z.infer<typeof rewardFormSchema>;

export default function EditRewardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const rewardId = params.rewardId as string;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [reward, setReward] = useState<Reward | null>(null);
  const [childName, setChildName] = useState<string | null>(null);


  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined, 
      starsCost: 10,
      isMaterial: false,
    },
  });

  useEffect(() => {
    if (!rewardId || !user) {
      setIsFetchingData(false);
      if(!user) router.push('/auth/login');
      else router.push('/dashboard/rewards');
      return;
    }

    const fetchRewardData = async () => {
      setIsFetchingData(true);
      try {
        const fetchedReward = await getRewardById(rewardId);
        if (fetchedReward) {
          setReward(fetchedReward);
          form.reset({
            title: fetchedReward.title,
            description: fetchedReward.description || '',
            category: fetchedReward.category,
            starsCost: fetchedReward.starsCost,
            isMaterial: fetchedReward.isMaterial,
          });
          if (fetchedReward.childId) {
            const child = await getChildProfileById(fetchedReward.childId);
            setChildName(child?.name || 'Criança não encontrada');
          }
        } else {
          toast({ title: "Recompensa não encontrada", variant: "destructive" });
          router.push('/dashboard/rewards');
        }
      } catch (error) {
        console.error("Error fetching reward:", error);
        toast({ title: "Erro ao carregar recompensa", variant: "destructive" });
        router.push('/dashboard/rewards');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchRewardData();
  }, [rewardId, user, router, toast, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        form.setValue('isMaterial', value.category === 'material');
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  const onSubmit = async (values: RewardFormValues) => {
    if (!user || !reward) {
      toast({ title: "Erro de Autenticação ou Dados", description: "Não foi possível salvar.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const updatePayload: Partial<Omit<Reward, 'id' | 'createdAt' | 'childId' | 'ownerId' | 'familyId' | 'status' | 'isRedeemed' | 'redeemedAt'>> = {
        title: values.title,
        description: values.description,
        category: values.category,
        starsCost: values.starsCost,
        isMaterial: values.isMaterial,
      };
      
      await updateReward(reward.id, updatePayload);
      toast({
        title: 'Recompensa Atualizada!',
        description: `A recompensa "${values.title}" foi salva com sucesso.`,
      });
      router.push('/dashboard/rewards'); 
    } catch (error) {
      console.error('Error updating reward:', error);
      toast({
        title: 'Erro ao Atualizar Recompensa',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3">Carregando dados da recompensa...</p>
      </div>
    );
  }

  if (!reward) {
     return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-lg text-destructive mb-4">Recompensa não encontrada.</p>
        <Button onClick={() => router.push('/dashboard/rewards')}>Voltar para Recompensas</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Recompensas
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Editar Recompensa</CardTitle>
              <CardDescription className="text-md">
                Modifique os detalhes da recompensa para {childName || 'Mini Heroi'}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {childName && (
                <FormItem>
                    <FormLabel>Para o Mini Heroi</FormLabel>
                    <Input value={childName} disabled className="bg-muted/50" />
                    <FormDescription>A criança associada a esta recompensa não pode ser alterada.</FormDescription>
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Recompensa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Uma tarde de jogos de tabuleiro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre a recompensa, como regras ou o que está incluído."
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria da Recompensa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rewardCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                             <div className="flex items-center">
                               {category.icon && <category.icon className={`mr-2 h-4 w-4 ${category.colorClasses.split(" ")[1]}`} />}
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${category.colorClasses}`}>
                                {category.label}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isMaterial"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={form.getValues('category') === 'material'} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Esta é uma recompensa material?
                      </FormLabel>
                      <FormDescription>
                        Marque se a recompensa é um objeto físico (ex: brinquedo, livro). Se a categoria já é 'Material', isto será marcado automaticamente.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="starsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo em Estrelas</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 50" {...field} />
                    </FormControl>
                    <FormDescription>
                      Quantas estrelas o Mini Heroi precisa para resgatar esta recompensa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isFetchingData}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Mantenha as recompensas atualizadas e motivadoras para seus Mini Herois!
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
