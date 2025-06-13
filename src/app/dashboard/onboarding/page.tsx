
import { OnboardingForm } from '@/components/dashboard/OnboardingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Users } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Rocket className="h-20 w-20 text-primary animate-pulse" />
          </div>
          <CardTitle className="font-headline text-4xl">Vamos Adicionar Seu Primeiro Mini Heroi!</CardTitle>
          <CardDescription className="text-lg">
            Toda grande aventura começa com um herói. Conte-nos um pouco sobre sua criança para começar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <OnboardingForm />
           <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-2 text-center">Colaboração Familiar (Opcional)</h3>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Quer gerenciar hábitos com outro pai/mãe ou responsável? Você pode configurar ou entrar em um grupo familiar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard/family?action=create">
                    <Button variant="outline" className="w-full sm:w-auto">
                        <Users className="mr-2 h-4 w-4" /> Criar uma Família
                    </Button>
                </Link>
                <Link href="/dashboard/family?action=join">
                    <Button variant="outline" className="w-full sm:w-auto">
                        <Users className="mr-2 h-4 w-4" /> Entrar em uma Família
                    </Button>
                </Link>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
                Você sempre pode fazer isso mais tarde no menu 'Família'.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
