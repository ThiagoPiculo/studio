
import { ChildLoginForm } from '@/components/auth/ChildLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ChildLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4 selection:bg-primary selection:text-primary-foreground">
      <Card className="w-full max-w-sm shadow-xl overflow-hidden">
         <CardHeader className="bg-primary text-primary-foreground text-center p-6">
          <div className="mb-3 flex justify-center">
            <Sparkles className="h-16 w-16 text-accent" />
          </div>
          <CardTitle className="font-headline text-3xl">Olá MiniHero!</CardTitle>
          <CardDescription className="text-primary-foreground/80">Digite seu código secreto para iniciar sua aventura.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ChildLoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Você é um Admin Master?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Login Admin
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
