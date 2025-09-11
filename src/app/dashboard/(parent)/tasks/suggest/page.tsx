
// src/app/dashboard/tasks/suggest/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SuggestTasksPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center w-full max-w-lg">
            <CardHeader>
                <div className="mx-auto mb-2">
                    <Lightbulb className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Página em Construção</CardTitle>
                <CardDescription>
                    O nosso assistente de IA para sugerir tarefas está sendo aprimorado e voltará em breve com novas ideias incríveis para seus heróis!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/tasks">
                    <Button>Voltar para o Quadro de Tarefas</Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  );
}
