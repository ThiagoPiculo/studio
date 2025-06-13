
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function RewardsHubPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Gift className="mr-3 h-8 w-8 text-primary" />
            Gerenciamento de Recompensas
          </CardTitle>
          <CardDescription>
            Crie, atribua e gerencie as recompensas que motivarão seus Mini Herois.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <PlusCircle className="mr-2 h-5 w-5 text-accent" />
                Criar Nova Recompensa
              </CardTitle>
              <CardDescription>
                Defina novas recompensas para seus Mini Herois resgatarem com suas estrelas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/rewards/new">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Adicionar Recompensa
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow opacity-50">
            <CardHeader>
              <CardTitle className="text-xl">
                Visualizar Recompensas Ativas
              </CardTitle>
               <CardDescription>
                Acompanhe todas as recompensas disponíveis para seus Mini Herois.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Ver Recompensas (Em Breve)
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recompensas Resgatadas (Em Breve)</CardTitle>
          <CardDescription>Aqui você verá todas as recompensas que foram resgatadas pelos seus Mini Herois.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A funcionalidade de listagem de recompensas resgatadas está em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
