
"use client";

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { joinFamilyByInviteCode } from '@/lib/firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { loginWithGoogle, user } = useAuth(); // Assuming loginWithGoogle also handles sign-up

  const [isLoading, setIsLoading] = useState(false);
  const inviteCode = searchParams.get('invite_code');

  const title = inviteCode ? "Junte-se à Equipe de Herois!" : "Criar conta no Mini Herois";
  const description = inviteCode ? "Crie sua conta para se juntar à família e começar a colaborar." : "Guie seus herois em jornadas inesquecíveis.";
  
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      // loginWithGoogle will create a user if they don't exist
      const userCredential = await loginWithGoogle(); 

      // After login/signup, if there's an invite code, try to join the family
      if (inviteCode && user?.uid) {
         try {
            await joinFamilyByInviteCode(user.uid, inviteCode);
            toast({ title: "Bem-vindo(a) à Equipe!", description: "Sua conta foi criada e você já se juntou à aventura em família." });
          } catch (e: any) {
             // Handle cases where joining might have an issue, e.g., already a member
             if (e.message === 'APPROVAL_PENDING') {
              toast({ title: "Pedido Enviado!", description: "Sua conta foi criada e um pedido para entrar na aliança foi enviado ao proprietário." });
            } else {
              toast({ title: "Boas-vindas!", description: "Sua conta foi criada com sucesso." });
            }
          }
      } else {
        toast({ title: "Boas-vindas!", description: "Sua Central de Comando foi criada com sucesso." });
      }

      router.push("/dashboard/heroes?initial_load=true");
    } catch (error: any) {
       // The error for popup closed by user is handled in the auth function itself
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-Up failed:", error);
        toast({
          title: "Falha na Criação com Google",
          description: "Não foi possível criar sua conta com o Google. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-clay rounded-2xl transition-all hover:shadow-clay-hover">
        <CardHeader className="text-center p-6">
          <div className="mb-4 flex justify-center group">
             <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
                <UserPlus className="h-12 w-12 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
             </div>
          </div>
          <CardTitle className="font-headline text-3xl">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
              <Button 
                  variant="outline" 
                  className="w-full rounded-full h-12 text-base" 
                  onClick={handleGoogleSignUp} 
                  disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                )}
                Continuar com o Google
              </Button>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="w-full justify-center text-base rounded-xl h-12 bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:no-underline [&[data-state=open]>svg]:text-primary [&[data-state=open]>svg]:rotate-180">
                      <Mail className="mr-2 h-5 w-5"/>
                      <span className="shrink-0 font-semibold">Ou crie sua conta com e-mail</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <MasterUserAuthForm mode="register" inviteCode={inviteCode} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já possui uma conta?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Fazer login no Mini Herois
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

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <RegisterPageContent />
        </Suspense>
    );
}
