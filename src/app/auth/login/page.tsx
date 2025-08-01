
'use client';

import { useState } from 'react';
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      toast({ title: "Boas-vindas!", description: "Sua aventura continua." });
      router.push("/dashboard/heroes?initial_load=true");
    } catch (error: any) {
      // The error for popup closed by user is handled in the auth function itself
      if (error.code !== 'auth/popup-closed-by-user') {
          console.error("Google Sign-In failed:", error);
          toast({
            title: "Falha no Login com Google",
            description: "Não foi possível fazer login com o Google. Tente novamente.",
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
                <Rocket className="h-12 w-12 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
             </div>
          </div>
          <CardTitle className="font-headline text-3xl">Que bom te ver de novo!</CardTitle>
          <CardDescription className="text-muted-foreground">
            A maneira mais rápida de entrar é com o Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
            <Button 
                variant="outline" 
                className="w-full rounded-full h-12 text-base" 
                onClick={handleGoogleSignIn} 
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
                <AccordionTrigger className="flex-no-wrap text-sm text-muted-foreground hover:no-underline [&[data-state=open]>svg]:text-primary">
                    <Separator className="shrink mr-3" />
                        <span className="shrink-0">Ou entre com e-mail</span>
                    <Separator className="shrink ml-3" />
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <MasterUserAuthForm mode="login" />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
         <CardContent className="p-6 pt-0 text-center text-sm text-muted-foreground space-y-2">
             <p>
                Primeira vez por aqui?{' '}
                <Link href="/auth/register" className="font-medium text-primary hover:underline">
                    Crie sua conta. É rapidinho
                </Link>
            </p>
            <p>
                É um Mini Heroi?{' '}
                <Link href="/child-login" className="font-medium text-primary hover:underline">
                    Entre e complete missões
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
