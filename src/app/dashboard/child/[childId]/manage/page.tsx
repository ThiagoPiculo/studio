
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChildProfileById, regenerateChildAccessCode, deleteChildProfile } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, ListChecks, Star as StarIcon, Edit3, ShieldCheck, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditChildProfileForm } from '@/components/dashboard/EditChildProfileForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ManageChildPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const childId = params.childId as string;

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

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
  
  const handleProfileUpdate = (updatedProfile: Partial<ChildProfile>) => {
    setChild(prev => prev ? { ...prev, ...updatedProfile } : null);
    toast({ title: "Perfil Atualizado", description: "As informações da criança foram atualizadas com sucesso." });
  };

  const handleRegenerateAccessCode = async () => {
    if (!child) return;
    setIsRegeneratingCode(true);
    try {
      const newAccessCode = await regenerateChildAccessCode(child.id);
      setChild(prev => prev ? { ...prev, accessCode: newAccessCode } : null);
      toast({
        title: "Código de Acesso Regenerado!",
        description: `O novo código de acesso para ${child.name} é: ${newAccessCode}`,
        duration: 10000, // Show for longer
      });
    } catch (error) {
      console.error("Error regenerating access code:", error);
      toast({ title: "Erro", description: "Não foi possível regenerar o código de acesso.", variant: "destructive" });
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!child) return;
    setIsDeleting(true);
    try {
      await deleteChildProfile(child.id);
      toast({ title: "Perfil Excluído", description: `${child.name} foi removido(a) do sistema.` });
      router.push('/dashboard');
    } catch (error) {
      console.error("Error deleting child profile:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o perfil da criança.", variant: "destructive" });
      setIsDeleting(false);
    }
  };


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
              <div className="mt-3 text-center sm:text-left">
                <span className="text-sm text-muted-foreground align-middle">
                  <ShieldCheck className="mr-1 h-4 w-4 inline-block text-primary relative -top-px" /> Código de Acesso:
                </span>
                <span className="ml-2 text-xl font-bold text-accent tracking-wider bg-accent/10 px-2 py-1 rounded-md shadow-sm">
                  {child.accessCode}
                </span>
              </div>
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
              <CardContent className="space-y-6">
                <EditChildProfileForm child={child} onProfileUpdate={handleProfileUpdate} />
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateAccessCode} 
                    disabled={isRegeneratingCode}
                    className="w-full shadow-sm"
                  >
                    {isRegeneratingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Regerar Código de Acesso
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full shadow-sm" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Excluir Perfil de {child.name}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de {child.name}
                           e todos os seus dados associados (tarefas, recompensas, progresso).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Sim, Excluir Perfil
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

