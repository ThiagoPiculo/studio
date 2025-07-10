
'use client';

import { useState } from 'react';
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetPassword } from '@/lib/firebase/auth';


export default function LoginPage() {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "E-mail necessário",
        description: "Por favor, insira seu e-mail para enviarmos o link de recuperação.",
        variant: "destructive",
      });
      return;
    }
    setIsResetting(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: "Link Enviado!",
        description: "Enviamos um link para o seu e-mail para que você possa criar uma nova senha.",
      });
    } catch (error: any) {
        let description = "Ocorreu um erro. Verifique o e-mail digitado ou tente novamente mais tarde.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            description = "Não encontramos uma conta com este e-mail. Verifique se o e-mail está correto.";
        }
        toast({
            title: "Erro ao enviar e-mail",
            description,
            variant: "destructive",
        });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-clay rounded-2xl transition-all hover:shadow-clay-hover">
        <CardHeader className="text-center p-6">
          <div className="mb-4 flex justify-center group">
             <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
                <Rocket className="h-12 w-12 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
             </div>
          </div>
          <CardTitle className="font-headline text-3xl">Que bom te ver de novo!</CardTitle>
          <CardDescription className="text-muted-foreground">Seus Mini Herois aguardam por novas missões!</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <MasterUserAuthForm mode="login" />

          <div className="mt-4 text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="link" className="text-sm p-0 h-auto text-primary">Vixiii, esqueci minha senha?</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Recuperar Senha</AlertDialogTitle>
                  <AlertDialogDescription>
                    Não se preocupe, acontece com os melhores heróis! Digite seu e-mail abaixo e enviaremos um link para você criar uma nova senha.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2 py-2">
                  <Label htmlFor="email-reset">Seu e-mail de acesso</Label>
                  <Input
                    id="email-reset"
                    type="email"
                    placeholder="mestre@miniherois.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePasswordReset} disabled={isResetting}>
                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Link de Recuperação
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Primeira vez por aqui?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Crie sua Central de Comando
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            É um Mini Heroi?{' '}
            <Link href="/child-login" className="font-medium text-primary hover:underline">
              Acesse o Portal Heroico
            </Link>
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-8 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar à tela inicial
      </Link>
    </div>
  );
}
