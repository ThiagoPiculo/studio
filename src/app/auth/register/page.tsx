
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary via-purple-600 to-accent text-center text-primary-foreground p-6">
          <div className="mb-4 flex justify-center">
            <UserPlus className="h-16 w-16 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-3xl">Monte sua Central de Missões</CardTitle>
          <CardDescription className="text-primary-foreground/90">Crie sua conta para guiar seus heróis em jornadas inesquecíveis.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <MasterUserAuthForm mode="register" />
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
