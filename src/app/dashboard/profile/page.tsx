
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Edit3, Save, KeyRound, Mail, AlertTriangle, Trash2, RotateCcw, CalendarOff, Shield } from 'lucide-react';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { resetPassword } from '@/lib/firebase/auth';
import { getChildProfilesByOwner, resetSelectedChildrenProgress, resetSchedulesForChildren } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
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
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isResetProgressDialogOpen, setIsResetProgressDialogOpen] = useState(false);
  const [selectedChildrenForProgress, setSelectedChildrenForProgress] = useState<Record<string, boolean>>({});

  const [isResettingRoutines, setIsResettingRoutines] = useState(false);
  const [isResetRoutinesDialogOpen, setIsResetRoutinesDialogOpen] = useState(false);
  const [selectedChildrenForRoutines, setSelectedChildrenForRoutines] = useState<Record<string, boolean>>({});

  const [children, setChildren] = useState<ChildProfile[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      getChildProfilesByOwner(user.uid).then(profiles => {
        setChildren(profiles);
      });
    }
  }, [user]);
  
  const groupedChildren = useMemo(() => {
    const groups: Record<string, ChildProfile[]> = { 'my-space': [] };
    
    children.forEach(child => {
        const contextId = child.familyId || 'my-space';
        if (!groups[contextId]) {
            groups[contextId] = [];
        }
        groups[contextId].push(child);
    });

    return Object.entries(groups).map(([contextId, childrenInGroup]) => {
      const contextInfo = availableContexts.find(c => c.id === contextId);
      const contextName = contextId === 'my-space' 
        ? 'No Meu Espaço' 
        : `Na Aliança "${contextInfo?.name || 'Desconhecida'}"`;
      return { contextId, contextName, children: childrenInGroup };
    }).filter(group => group.children.length > 0);
  }, [children, availableContexts]);


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const handleSaveName = async () => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    if (displayName.trim().length < 2) {
      toast({ title: "Nome Inválido", description: "O nome deve ter pelo menos 2 caracteres.", variant: "destructive" });
      return;
    }

    setIsSavingName(true);
    try {
      await updateAuthProfile(auth.currentUser, { displayName: displayName.trim() });
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name: displayName.trim() });
      toast({ title: "Identidade de Heroi Atualizada!", description: "Seu nome foi atualizado com sucesso." });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível atualizar seu nome. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast({ title: "Erro", description: "E-mail do usuário não encontrado.", variant: "destructive" });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await resetPassword(user.email);
      toast({ title: "Mapa Secreto Enviado!", description: "Enviamos um link para o seu e-mail para que você possa criar uma nova senha." });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({ title: "Erro ao Enviar E-mail", description: "Não foi possível enviar o e-mail de redefinição. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleResetSelectedProgress = async () => {
    if (!user) return;
    const childIdsToReset = Object.entries(selectedChildrenForProgress).filter(([, selected]) => selected).map(([id]) => id);
    if (childIdsToReset.length === 0) {
        toast({ title: "Nenhuma criança selecionada." });
        return;
    }
    setIsResettingProgress(true);
    try {
      await resetSelectedChildrenProgress(user.uid, childIdsToReset);
      const childNames = children.filter(c => childIdsToReset.includes(c.id)).map(c => c.name);
      toast({ title: "Progresso Redefinido!", description: `O progresso de ${formatChildNames(childNames)} foi zerado.` });
      setIsResetProgressDialogOpen(false);
      setSelectedChildrenForProgress({});
    } catch (error: any) {
      console.error("Error resetting progress for selected children:", error);
      toast({ title: "Erro ao Redefinir", description: error.message || "Não foi possível redefinir o progresso.", variant: "destructive" });
    } finally {
      setIsResettingProgress(false);
    }
  };

  const handleResetSelectedRoutines = async () => {
    if (!user) return;
    const childIdsToReset = Object.entries(selectedChildrenForRoutines).filter(([, selected]) => selected).map(([id]) => id);
    if (childIdsToReset.length === 0) {
        toast({ title: "Nenhuma criança selecionada." });
        return;
    }
    setIsResettingRoutines(true);
    try {
      await resetSchedulesForChildren(user.uid, childIdsToReset);
      const childNames = children.filter(c => childIdsToReset.includes(c.id)).map(c => c.name);
      toast({ title: "Rotinas Removidas!", description: `Todas as missões agendadas para ${formatChildNames(childNames)} foram removidas.` });
      setIsResetRoutinesDialogOpen(false);
      setSelectedChildrenForRoutines({});
    } catch (error: any) {
      console.error("Error resetting routines for selected children:", error);
      toast({ title: "Erro ao Remover Rotinas", description: error.message || "Não foi possível limpar a agenda das crianças selecionadas.", variant: "destructive" });
    } finally {
      setIsResettingRoutines(false);
    }
  };
  
  const handleDeleteAccount = () => {
    toast({
        title: "Função em Desenvolvimento",
        description: "A exclusão de conta será implementada em breve. Por enquanto, se desejar excluir sua conta, entre em contato com o suporte.",
        duration: 8000,
    });
  };
  
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  const formatChildNames = (names: string[]) => {
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    const last = names.pop();
    return `${names.join(', ')} e ${last}`;
  };

  const selectedProgressCount = useMemo(() => Object.values(selectedChildrenForProgress).filter(Boolean).length, [selectedChildrenForProgress]);
  const selectedRoutinesCount = useMemo(() => Object.values(selectedChildrenForRoutines).filter(Boolean).length, [selectedChildrenForRoutines]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p>Usuário não encontrado. Por favor, faça login novamente.</p>
        <Button onClick={() => router.push('/auth/login')} className="mt-4">Ir para Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserCircle className="h-12 w-12 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Meu Perfil</CardTitle>
              <CardDescription>Gerencie suas informações pessoais.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">E-mail</Label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <p id="email" className="text-lg">{user.email}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Seu e-mail de login não pode ser alterado por aqui.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Nome de Exibição</Label>
            {!isEditingName ? (
              <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-muted/20">
                <p id="name" className="text-lg">{user.name || 'Não definido'}</p>
                <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)} className="shadow-sm">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar Nome
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                <Input
                  id="name"
                  value={displayName}
                  onChange={handleNameChange}
                  className="text-lg"
                  placeholder="Seu nome de exibição"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => { setIsEditingName(false); setDisplayName(user.name || ''); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveName} disabled={isSavingName} className="bg-primary hover:bg-primary/90">
                    {isSavingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Nome
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive/50 shadow-lg">
        <CardHeader className="bg-destructive/5">
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-6 w-6"/> Zona de Perigo</CardTitle>
            <CardDescription className="text-destructive/90">As ações abaixo são importantes e, em alguns casos, irreversíveis. Use com cuidado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-1">
                <h4 className="font-semibold">Redefinir Senha</h4>
                <p className="text-sm text-muted-foreground">Será enviado um link para seu e-mail (<span className="font-semibold text-foreground">{user.email}</span>) para que você possa criar uma nova senha de acesso.</p>
                <Button 
                  variant="outline" 
                  onClick={handlePasswordReset} 
                  disabled={isSendingResetEmail}
                  className="w-full sm:w-auto shadow-sm"
                >
                  {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Enviar E-mail de Redefinição
                </Button>
            </div>
            
            <Separator className="my-8" />
            
            <div className="space-y-1">
                <h4 className="font-semibold">Redefinir Progresso dos Herois</h4>
                <p className="text-sm text-muted-foreground">Zera as estrelas, XP e o histórico de missões das crianças selecionadas. Ideal para começar uma "nova temporada".</p>
                 <AlertDialog open={isResetProgressDialogOpen} onOpenChange={setIsResetProgressDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={children.length === 0 || isResettingProgress}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Redefinir Progresso
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Redefinir o progresso de quais heróis?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Selecione as crianças (apenas as que você cadastrou) que terão seu progresso zerado. Esta ação é irreversível e afetará estrelas, XP, níveis e históricos.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <ScrollArea className="max-h-[40vh] my-4 pr-3">
                           <div className="space-y-4">
                             {groupedChildren.map(group => (
                               <div key={group.contextId}>
                                 <Label className="font-semibold text-muted-foreground">{group.contextName}</Label>
                                 <div className="space-y-2 mt-2">
                                  {group.children.map(child => (
                                      <Label key={child.id} htmlFor={`progress-reset-${child.id}`} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 cursor-pointer">
                                        <Checkbox id={`progress-reset-${child.id}`} checked={!!selectedChildrenForProgress[child.id]} onCheckedChange={(checked) => setSelectedChildrenForProgress(prev => ({...prev, [child.id]: !!checked}))} />
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={child.avatar} alt={child.name} />
                                          <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <span>{child.name}</span>
                                      </Label>
                                  ))}
                                  </div>
                               </div>
                             ))}
                           </div>
                        </ScrollArea>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isResettingProgress}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetSelectedProgress} className="bg-destructive hover:bg-destructive/90" disabled={isResettingProgress || selectedProgressCount === 0}>
                                {isResettingProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Redefinir ({selectedProgressCount})
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            </div>

            <Separator className="my-8" />

            <div className="space-y-1">
                <h4 className="font-semibold">Redefinir Rotina Agendada</h4>
                <p className="text-sm text-muted-foreground">Remove TODAS as missões (únicas e recorrentes) da agenda das crianças selecionadas. Use para limpar a agenda e começar do zero.</p>
                 <AlertDialog open={isResetRoutinesDialogOpen} onOpenChange={setIsResetRoutinesDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={children.length === 0 || isResettingRoutines}>
                            <CalendarOff className="mr-2 h-4 w-4" /> Redefinir Rotinas
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Limpar a agenda de quais heróis?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Selecione as crianças (apenas as que você cadastrou) para remover TODAS as missões agendadas. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <ScrollArea className="max-h-[40vh] my-4 pr-3">
                           <div className="space-y-4">
                             {groupedChildren.map(group => (
                               <div key={group.contextId}>
                                 <Label className="font-semibold text-muted-foreground">{group.contextName}</Label>
                                 <div className="space-y-2 mt-2">
                                  {group.children.map(child => (
                                      <Label key={child.id} htmlFor={`routine-reset-${child.id}`} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 cursor-pointer">
                                        <Checkbox id={`routine-reset-${child.id}`} checked={!!selectedChildrenForRoutines[child.id]} onCheckedChange={(checked) => setSelectedChildrenForRoutines(prev => ({...prev, [child.id]: !!checked}))} />
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={child.avatar} alt={child.name} />
                                          <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <span>{child.name}</span>
                                      </Label>
                                  ))}
                                  </div>
                               </div>
                             ))}
                           </div>
                        </ScrollArea>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isResettingRoutines}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetSelectedRoutines} className="bg-destructive hover:bg-destructive/90" disabled={isResettingRoutines || selectedRoutinesCount === 0}>
                                {isResettingRoutines && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Limpar Agenda ({selectedRoutinesCount})
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            </div>
            
            <Separator className="my-8" />
            
             <div className="space-y-1">
                <h4 className="font-semibold">Excluir Conta Permanentemente</h4>
                <p className="text-sm text-muted-foreground">Isso removerá sua conta de Mestre e todos os dados associados (perfis de crianças, missões, etc.) de forma permanente.</p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto shadow-sm">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Minha Conta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza ABSOLUTA?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação é final e não pode ser desfeita. Todos os seus dados, incluindo perfis de crianças, missões, recompensas e progresso, serão <span className="font-bold">excluídos permanentemente</span>.
                                <br/><br/>
                                Por segurança, ao confirmar, enviaremos um e-mail com o passo final para a exclusão.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                                Entendi, quero excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
