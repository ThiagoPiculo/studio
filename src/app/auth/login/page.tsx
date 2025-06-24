import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Rocket className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <CardTitle className="font-headline text-3xl">Que bom te ver de novo!</CardTitle>
          <CardDescription>Seus Mini Herois aguardam por novas missões!</CardDescription>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}
