
// src/app/dashboard/tasks/page.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ListChecks } from 'lucide-react';
import Link from 'next/link';

export default function TasksHubPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <ListChecks className="mr-3 h-8 w-8 text-primary" />
            Gerenciamento de Tarefas
          </CardTitle>
          <CardDescription>
            Crie, atribua e acompanhe as tarefas dos seus Mini Herois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="hover:shadow-md transition-shadow max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">
                Criar Nova Tarefa (Em Breve)
              </CardTitle>
               <CardDescription>
                Defina manualmente tarefas para seus Mini Herois.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Criar Tarefa Manualmente
              </Button>
               <p className="text-xs text-muted-foreground mt-2 text-center">Esta funcionalidade está em desenvolvimento.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas Atribuídas (Em Breve)</CardTitle>
          <CardDescription>Aqui você verá todas as tarefas que foram atribuídas aos seus Mini Herois.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A funcionalidade de listagem de tarefas está em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
