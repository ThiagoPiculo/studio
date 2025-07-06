
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Edit3, Save, KeyRound, Mail } from 'lucide-react';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { resetPassword } from '@/lib/firebase/auth';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
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
      // Atualizar no Firebase Authentication
      await updateAuthProfile(auth.currentUser, { displayName: displayName.trim() });

      // Atualizar no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name: displayName.trim() });

      toast({ title: "Identidade de Heroi Atualizada!", description: "Seu nome foi atualizado com sucesso." });
      setIsEditingName(false);
      // O AuthContext deve atualizar o nome automaticamente devido ao listener do Firestore
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

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Segurança da Conta</h3>
            <Button 
              variant="outline" 
              onClick={handlePasswordReset} 
              disabled={isSendingResetEmail}
              className="w-full sm:w-auto shadow-sm"
            >
              {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Redefinir Senha por E-mail
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Será enviado um link para o seu e-mail ({user.email}) para que você possa criar uma nova senha.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
