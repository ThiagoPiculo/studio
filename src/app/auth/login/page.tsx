
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-clay rounded-2xl transition-all hover:shadow-clay-hover">
        <CardHeader className="text-center p-6">
          <div className="mb-4 flex justify-center group">
            <Rocket className="h-16 w-16 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
          </div>
          <CardTitle className="font-headline text-3xl">Que bom te ver de novo!</CardTitle>
          <CardDescription className="text-muted-foreground">Seus Mini Herois aguardam por novas missões!</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <MasterUserAuthForm mode="login" />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Primeira vez por aqui?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Crie sua central de missões
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            É um Mini Herois?{' '}
            <Link href="/child-login" className="font-medium text-primary hover:underline">
              Acesse o portal da aventura
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
