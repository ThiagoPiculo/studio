
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

  const title = inviteCode ? "Junte-se à Equipe de Herois!" : "Criar conta no Mini Heróis";
  const description = inviteCode ? "Crie sua conta para se juntar à família e começar a colaborar." : "Guie seus heróis em jornadas inesquecíveis.";
  
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      // loginWithGoogle will create a user if they don't exist
      const userCredential = await loginWithGoogle(); 
      sessionStorage.setItem('postLoginRefresh', 'true');

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
        toast({ title: "Boas-vindas!", description: "Sua Central de Mini Heróis foi criada com sucesso." });
      }

      router.push("/dashboard");
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
      <Card className="relative w-full max-w-md shadow-clay rounded-2xl transition-all hover:shadow-clay-hover pt-12">
        <Link href="/" className="absolute top-4 left-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            voltar
        </Link>
        <CardHeader className="text-center p-6 pt-0">
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
                  variant="secondary"
                  className="w-full rounded-xl h-12 text-base font-semibold shadow-clay hover:shadow-clay-hover active:shadow-clay-inset" 
                  onClick={handleGoogleSignUp} 
                  disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C44.438,36.338,48,31,48,24C48,22.659,47.862,21.35,47.611,20.083z"/></svg>
                )}
                Continuar com o Google
              </Button>
              
              <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="w-full justify-center text-base rounded-xl h-12 bg-transparent border border-input shadow-clay hover:shadow-clay-hover active:shadow-clay-inset hover:no-underline [&[data-state=open]>svg]:rotate-180">
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
                Fazer login no Mini Heróis
              </Link>
            </p>
        </CardContent>
      </Card>
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
