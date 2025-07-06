
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Edit3, Save, KeyRound, Mail, AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { resetPassword } from '@/lib/firebase/auth';
import { getChildProfilesByOwner, resetAllChildrenProgress } from '@/lib/firebase/firestore';
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


export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isResettingAllProgress, setIsResettingAllProgress] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      getChildProfilesByOwner(user.uid).then(profiles => {
        setChildren(profiles);
      });
    }
  }, [user]);

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
      toast({ title: "Mapa Secreto Enviado!", description: "Enviamos um link para seu e-mail para você criar uma nova senha." });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({ title: "Erro ao Enviar E-mail", description: "Não foi possível enviar o e-mail de redefinição. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleResetAllProgress = async () => {
      if (!user) return;
      setIsResettingAllProgress(true);
      try {
        await resetAllChildrenProgress(user.uid);
        toast({ title: "Nova Temporada Iniciada!", description: "O progresso de todos os seus Mini Herois foi redefinido." });
      } catch (error) {
        console.error("Error resetting all children progress:", error);
        toast({ title: "Erro ao Redefinir", description: "Não foi possível redefinir o progresso. Tente novamente.", variant: "destructive" });
      } finally {
        setIsResettingAllProgress(false);
      }
  };
  
  const handleDeleteAccount = () => {
    toast({
        title: "Função em Desenvolvimento",
        description: "A exclusão de conta será implementada em breve. Por enquanto, se desejar excluir sua conta, entre em contato com o suporte.",
        duration: 8000,
    });
  };

  const formatChildNames = (children: ChildProfile[]) => {
    const names = children.map(c => c.name);
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    const last = names.pop();
    return `${names.join(', ')} e ${last}`;
  };

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
                <p className="text-sm text-muted-foreground">Será enviado um link para seu e-mail ({user.email}) para que você possa criar uma nova senha de acesso.</p>
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
            
            <Separator />
            
            <div className="space-y-1">
                <h4 className="font-semibold">Redefinir Progresso de Todos os Herois</h4>
                <p className="text-sm text-muted-foreground">Esta ação irá zerar as estrelas, XP e o histórico de missões de todos os seus Mini Herois, sem apagar os perfis. Ideal para começar uma "nova temporada".</p>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto shadow-sm" disabled={children.length === 0 || isResettingAllProgress}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Redefinir Progresso Geral
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Redefinir o progresso de TODOS os seus heróis?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação é irreversível e afetará o progresso de {children.length} {children.length === 1 ? 'herói' : 'heróis'} sob sua gestão: <span className="font-semibold">{formatChildNames(children)}</span>. Todas as estrelas, XP, níveis e históricos de conclusão serão zerados. Deseja continuar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isResettingAllProgress}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetAllProgress} className="bg-destructive hover:bg-destructive/90" disabled={isResettingAllProgress}>
                                {isResettingAllProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sim, Redefinir Tudo
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            </div>
            
             <Separator />
            
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
