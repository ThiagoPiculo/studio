
import { MasterUserAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <UserPlus className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Monte sua Central de Missões</CardTitle>
          <CardDescription>Crie sua conta para guiar seus heróis em jornadas inesquecíveis.</CardDescription>
        </CardHeader>
        <CardContent>
          <MasterUserAuthForm mode="register" />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Acesse sua central
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
