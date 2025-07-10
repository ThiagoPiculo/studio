
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite_code');

  const title = inviteCode ? "Junte-se à Equipe de Herois!" : "Monte sua Central de Comando";
  const description = inviteCode ? "Crie sua conta para se juntar à família e começar a colaborar." : "Crie sua conta para guiar seus herois em jornadas inesquecíveis.";

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
        <CardContent className="p-6">
          <MasterUserAuthForm mode="register" inviteCode={inviteCode} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Acesse sua central
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
