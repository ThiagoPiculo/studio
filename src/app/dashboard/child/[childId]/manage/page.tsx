
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChildProfileById } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, ListChecks, Star as StarIcon, Edit3, ShieldCheck, Loader2 } from 'lucide-react'; // Renamed Star to StarIcon to avoid conflict
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ManageChildPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const childId = params.childId as string;

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (childId) {
      setIsLoading(true);
      getChildProfileById(childId)
        .then((profile) => {
          if (profile) {
            setChild(profile);
          } else {
            toast({ title: "Erro", description: "Perfil da criança não encontrado.", variant: "destructive" });
            router.push('/dashboard');
          }
        })
        .catch((error) => {
          console.error("Error fetching child profile:", error);
          toast({ title: "Erro ao Carregar", description: "Não foi possível carregar os dados da criança.", variant: "destructive" });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        router.push('/dashboard');
    }
  }, [childId, router, toast]);

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Carregando dados do MiniHero...</p>
      </div>
    );
  }

  if (!child) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">MiniHero não encontrado.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Voltar ao Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 via-background to-accent/10 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-28 w-28 border-4 border-primary text-5xl shadow-md">
              {child.avatar ? <AvatarImage src={child.avatar} alt={child.name} /> : null}
              <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                {getInitials(child.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-grow">
              <CardTitle className="text-4xl font-headline text-primary">{child.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                Idade: {child.age} Anos
              </CardDescription>
               <div className="mt-2 flex items-center justify-center sm:justify-start space-x-4 text-sm">
                <span className="font-semibold">Nível: {child.level}</span>
                <span className="font-semibold text-accent flex items-center"><StarIcon className="inline-block h-4 w-4 mr-1 fill-accent" /> {child.stars}</span>
                <span className="font-semibold">XP: {child.xp}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center sm:justify-start">
                <ShieldCheck className="mr-1 h-3 w-3 text-primary" /> Código de Acesso: <span className="font-semibold text-primary ml-1">{child.accessCode}</span>
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><User className="mr-2 h-4 w-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><ListChecks className="mr-2 h-4 w-4" />Tarefas</TabsTrigger>
          <TabsTrigger value="rewards" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><StarIcon className="mr-2 h-4 w-4" />Recompensas</TabsTrigger>
          <TabsTrigger value="edit" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Edit3 className="mr-2 h-4 w-4" />Editar Perfil</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          <TabsContent value="overview">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Visão Geral de {child.name}</CardTitle>
                <CardDescription>Resumo das atividades e progresso do seu MiniHero.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Aqui você verá um resumo das atividades recentes, tarefas pendentes e recompensas disponíveis para {child.name}.</p>
                <p>Mais gráficos e estatísticas de progresso aparecerão aqui em breve!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Nenhuma tarefa recente. (Funcionalidade a ser implementada)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">Recompensas Resgatadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Nenhuma recompensa resgatada recentemente. (Funcionalidade a ser implementada)</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tasks">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Tarefas de {child.name}</CardTitle>
                <CardDescription>Gerencie e atribua novas tarefas para ajudar {child.name} a crescer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">A funcionalidade de gerenciamento detalhado de tarefas está em desenvolvimento.</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <ListChecks className="mr-2 h-4 w-4" /> Adicionar Nova Tarefa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rewards">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recompensas para {child.name}</CardTitle>
                <CardDescription>Crie e gerencie recompensas para motivar {child.name}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">A funcionalidade de gerenciamento de recompensas está em desenvolvimento.</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                   <StarIcon className="mr-2 h-4 w-4" /> Criar Nova Recompensa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="edit">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Editar Perfil de {child.name}</CardTitle>
                <CardDescription>Atualize as informações da criança e configurações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">O formulário para editar nome, idade, avatar e outras configurações (como regenerar código de acesso) está em desenvolvimento.</p>
                {/* Placeholder for edit form component or direct form fields */}
                <Button variant="destructive" disabled>Excluir Perfil (Em breve)</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
