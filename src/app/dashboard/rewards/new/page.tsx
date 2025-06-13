
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addReward } from '@/lib/firebase/firestore';
import { getChildProfilesByOwner, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import type { ChildProfile, RewardCategory } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; // Importando as categorias
import { Loader2, Gift, PlusCircle, ArrowLeft } from 'lucide-react';

const rewardFormSchema = z.object({
  childId: z.string().min(1, { message: "Selecione uma criança." }),
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional(),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
});

type RewardFormValues = z.infer<typeof rewardFormSchema>;

export default function CreateRewardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      childId: '',
      title: '',
      description: '',
      starsCost: 10,
      isMaterial: false,
    },
  });

  useEffect(() => {
    const fetchChildren = async () => {
      if (!user) return;
      setIsLoadingChildren(true);
      try {
        let profiles: ChildProfile[];
        if (currentContext === 'my-space') {
          profiles = await getChildProfilesByOwner(user.uid);
        } else {
          profiles = await getChildProfilesByFamily(currentContext);
        }
        setChildren(profiles);
      } catch (error) {
        console.error("Error fetching children:", error);
        toast({ title: "Erro ao buscar crianças", description: "Não foi possível carregar a lista de crianças.", variant: "destructive" });
        setChildren([]);
      } finally {
        setIsLoadingChildren(false);
      }
    };
    fetchChildren();
  }, [user, currentContext, toast]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        form.setValue('isMaterial', value.category === 'material');
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  const onSubmit = async (values: RewardFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const rewardData = {
        ...values,
        ownerId: user.uid,
        familyId: currentContext !== 'my-space' ? currentContext : undefined,
      };
      await addReward(rewardData);
      toast({
        title: 'Recompensa Criada!',
        description: `A recompensa "${values.title}" foi adicionada com sucesso.`,
      });
      router.push('/dashboard/rewards');
    } catch (error) {
      console.error('Error creating reward:', error);
      toast({
        title: 'Erro ao Criar Recompensa',
        description: 'Não foi possível criar a recompensa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <CardTitle className="text-3xl font-headline">Criar Nova Recompensa</CardTitle>
              <CardDescription className="text-md">
                Defina um novo item ou experiência que seus Mini Herois podem resgatar com suas estrelas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="childId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Qual Mini Heroi?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingChildren}>
                      <FormControl>
                        <SelectTrigger>
                          {isLoadingChildren ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          <SelectValue placeholder="Selecione uma criança..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingChildren && <SelectItem value="loading" disabled>Carregando crianças...</SelectItem>}
                        {!isLoadingChildren && children.length === 0 && <SelectItem value="no-children" disabled>Nenhuma criança encontrada.</SelectItem>}
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      A recompensa será associada a esta criança.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rewardCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${category.colorClasses}`}>
                              {category.label}
                            </span>
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
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isLoadingChildren || children.length === 0}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Criar Recompensa
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                As recompensas são uma ótima forma de motivar e celebrar as conquistas dos seus Mini Herois!
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
