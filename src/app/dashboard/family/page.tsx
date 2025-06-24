"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createFamily, joinFamilyByInviteCode, getFamilyById, getFamilyMembers, leaveFamily, deleteFamily } from '@/lib/firebase/firestore';
import type { Family, UserProfile } from '@/lib/types';
import { Loader2, Users, UserPlus, Copy, LogOut, Trash2, Home, Link as LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Loading from './loading';

function FamilyPageContent() {
  const { user } = useAuth();
  const { currentContext, setCurrentContext, availableContexts, setAvailableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isClient, setIsClient] = useState(false);
  const [familyDetails, setFamilyDetails] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // States for the forms
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  useEffect(() => {
    setIsClient(true); // Component has mounted
  }, []);

  useEffect(() => {
    if (!user || !isClient) return;

    if (currentContext === 'my-space') {
      setIsLoading(false);
      setFamilyDetails(null);
      setFamilyMembers([]);
    } else {
      setIsLoading(true);
      const fetchFamilyData = async () => {
        try {
          const [details, members] = await Promise.all([
            getFamilyById(currentContext),
            getFamilyMembers(currentContext)
          ]);
          setFamilyDetails(details);
          setFamilyMembers(members);
        } catch (error) {
          console.error("Error fetching family data:", error);
          toast({ title: "Erro ao Carregar Família", description: "Não foi possível buscar os dados da família. Voltando para seu espaço pessoal.", variant: "destructive" });
          setCurrentContext('my-space');
        } finally {
          setIsLoading(false);
        }
      };
      fetchFamilyData();
    }
  }, [currentContext, user, toast, setCurrentContext, isClient]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || familyName.trim().length < 3) {
      toast({ title: "Nome da Família Inválido", description: "O nome deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const newFamily = await createFamily(user.uid, familyName.trim());
      const newContext = { id: newFamily.id, name: newFamily.name };
      setAvailableContexts([...availableContexts, newContext]);
      setCurrentContext(newFamily.id);
      toast({ title: "Família Criada com Sucesso!", description: `Bem-vindo à Família ${newFamily.name}!` });
      router.push('/dashboard/family');
    } catch (error) {
      console.error("Error creating family:", error);
      toast({ title: "Erro ao Criar Família", description: "Ocorreu um erro. Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || inviteCode.trim().length !== 6) {
      toast({ title: "Código de Convite Inválido", description: "O código deve ter exatamente 6 dígitos.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const membership = await joinFamilyByInviteCode(user.uid, inviteCode.trim());
      if (membership) {
        const family = await getFamilyById(membership.familyId);
        if(family) {
            const newContext = { id: family.id, name: family.name };
            // Avoid adding duplicate context
            if(!availableContexts.find(c => c.id === newContext.id)){
              setAvailableContexts([...availableContexts, newContext]);
            }
            setCurrentContext(family.id);
            toast({ title: "Você Entrou na Família!", description: `Agora você faz parte da Família ${family.name}!` });
            router.push('/dashboard/family');
        }
      } else {
          toast({ title: "Código Inválido ou Inexistente", description: "Verifique o código e tente novamente.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error joining family:", error);
      toast({ title: "Erro ao Entrar na Família", description: "Ocorreu um erro. Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (!familyDetails?.inviteCode) return;
    navigator.clipboard.writeText(familyDetails.inviteCode);
    toast({ title: "Código Copiado!", description: "O código de convite foi copiado para sua área de transferência." });
  };
  
  const handleAction = async (action: 'leave' | 'delete') => {
    if (!user || currentContext === 'my-space') return;
    setIsProcessing(true);
    try {
      if (action === 'leave') {
        await leaveFamily(user.uid, currentContext);
        toast({ title: "Você Saiu da Família", description: "Seu espaço voltou a ser pessoal." });
      } else if (action === 'delete') {
        await deleteFamily(currentContext);
        toast({ title: "Família Excluída", description: "A família foi desfeita com sucesso." });
      }
      // Reset context after leaving/deleting
      setAvailableContexts(availableContexts.filter(c => c.id !== currentContext));
      setCurrentContext('my-space');
      router.push('/dashboard');
    } catch (error) {
      console.error(`Error ${action === 'leave' ? 'leaving' : 'deleting'} family:`, error);
      toast({ title: `Erro ao ${action === 'leave' ? 'Sair' : 'Excluir'}`, description: "Não foi possível completar a ação. Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "P";

  if (!isClient || isLoading) {
    return <Loading />;
  }

  // View when user is in a Family
  if (currentContext !== 'my-space' && familyDetails) {
    const isOwner = user?.uid === familyDetails.ownerId;
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-headline">Família: {familyDetails.name}</CardTitle>
                <CardDescription>Gerencie os membros e as configurações da sua família.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Convidar para Família</CardTitle>
              <CardDescription>Compartilhe este código com outro responsável para que ele se junte à sua família.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Input value={familyDetails.inviteCode} readOnly className="text-xl font-mono tracking-widest" />
              <Button onClick={handleCopyCode} variant="outline" size="icon" aria-label="Copiar código de convite">
                <Copy className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Membros da Família</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {familyMembers.map(member => (
                <div key={member.uid} className="flex flex-col items-center gap-2">
                  <Avatar className="h-16 w-16 text-2xl border-2 border-primary">
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center">{member.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isProcessing}>
                  {isOwner ? <Trash2 className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
                  {isOwner ? "Excluir Família" : "Sair da Família"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isOwner 
                      ? "Esta ação não pode ser desfeita. Isso excluirá permanentemente a família, removerá todos os membros e desvinculará todas as crianças associadas." 
                      : "Você sairá desta família. Suas crianças deixarão de ser gerenciadas em conjunto com este grupo."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction(isOwner ? 'delete' : 'leave')} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sim, {isOwner ? "Excluir" : "Sair"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-destructive/80 mt-2">
                {isOwner ? "Esta é uma ação permanente e afetará todos os membros." : "Você pode se juntar novamente mais tarde com um novo código de convite."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View when user is in "My Space" (not in a family)
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Colaboração Familiar
          </CardTitle>
          <CardDescription>
            Crie uma família para gerenciar os Mini Herois em conjunto com outro pai, mãe ou responsável, ou junte-se a uma família já existente.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue={searchParams.get('action') || 'create'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create"><UserPlus className="mr-2 h-4 w-4" />Criar uma Família</TabsTrigger>
          <TabsTrigger value="join"><LinkIcon className="mr-2 h-4 w-4" />Entrar em uma Família</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Crie Sua Própria Família</CardTitle>
              <CardDescription>Dê um nome para sua família. Após criar, você receberá um código para convidar outros responsáveis.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateFamily}>
              <CardContent className="space-y-2">
                <Input 
                  placeholder="Ex: Família Aventura" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required 
                />
              </CardContent>
              <CardFooter>
                 <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Criar Família
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="join">
          <Card>
            <CardHeader>
              <CardTitle>Junte-se a uma Família Existente</CardTitle>
              <CardDescription>Peça o código de convite de 6 dígitos para o administrador da família e insira-o abaixo.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinFamily}>
              <CardContent className="space-y-2">
                 <Input 
                  placeholder="Código de 6 dígitos"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  maxLength={6}
                  required
                  className="font-mono tracking-widest"
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                  Entrar com Código
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
       <Card className="bg-muted/50">
        <CardHeader className="flex-row items-center gap-3">
          <Home className="h-6 w-6 text-muted-foreground"/>
          <div>
            <CardTitle className="text-lg">O que é o "Meu Espaço"?</CardTitle>
            <CardDescription className="text-sm">
                Seu espaço é seu ambiente pessoal padrão. Você pode gerenciar seus Mini Herois aqui sem precisar de uma família. A funcionalidade de família é totalmente opcional.
            </CardDescription>
          </div>
        </CardHeader>
       </Card>
    </div>
  );
}

export default function FamilyPage() {
    return (
        <Suspense fallback={<Loading />}>
            <FamilyPageContent />
        </Suspense>
    )
}
