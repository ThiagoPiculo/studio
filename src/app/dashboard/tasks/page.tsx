
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
            Crie, atribua e acompanhe as tarefas dos seus Mini Herois. Use a IA para obter inspiração!
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-accent" />
                Sugerir Tarefas com IA
              </CardTitle>
              <CardDescription>
                Não sabe por onde começar? Deixe nossa IA ajudar a criar tarefas personalizadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/tasks/suggest">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Obter Sugestões
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
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
