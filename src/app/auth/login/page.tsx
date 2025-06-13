import { AdminAuthForm } from '@/components/auth/AdminAuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Rocket className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome Back, Admin Master!</CardTitle>
          <CardDescription>Log in to manage your MiniHeroes.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm mode="login" />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New Admin Master?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Are you a MiniHero?{' '}
            <Link href="/child-login" className="font-medium text-primary hover:underline">
              Child Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}