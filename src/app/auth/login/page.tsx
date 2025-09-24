import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Shield, UserCircle } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 selection:bg-accent selection:text-accent-foreground">
       <div className="flex items-center gap-3 mb-8">
         <Image src="/logo.png" alt="Mini Heróis Logo" width={40} height={40} />
         <h1 className="text-4xl font-bold font-headline text-primary">Mini Heróis</h1>
       </div>
       <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* Card de Acesso do Responsável */}
        <Card className="flex flex-col shadow-clay transition-all hover:shadow-clay-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="font-headline text-2xl">Acesso do Responsável</CardTitle>
                <CardDescription>Gerencie missões, recompensas e o progresso dos seus heróis.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              Entre na sua Central de Comando para criar novas aventuras, acompanhar as conquistas e celebrar cada vitória.
            </p>
          </CardContent>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/login-responsavel">
                Entrar como Responsável <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Acesso do Herói */}
        <Card className="flex flex-col shadow-clay transition-all hover:shadow-clay-hover">
          <CardHeader>
             <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <div>
                <CardTitle className="font-headline text-2xl">Portal do Mini Herói</CardTitle>
                <CardDescription>Acesse seu painel para ver e completar suas missões diárias.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              Sua jornada heroica te espera! Use seu código de acesso secreto para ver seus desafios e conquistar estrelas.
            </p>
          </CardContent>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard/child-login">
                Entrar como Mini Herói <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
