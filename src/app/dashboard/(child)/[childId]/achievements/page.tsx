'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Medal } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AchievementsPage() {
  return (
    <div className="p-4 pb-24">
        <Card className="text-center w-full max-w-lg mx-auto mt-8">
            <CardHeader>
                <div className="mx-auto mb-2">
                    <Medal className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Página em Construção</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Seu quadro de medalhas e grandes conquistas está sendo polido e ficará pronto em breve!
                </p>
                <Link href="/dashboard/heroes">
                    <Button>Voltar para as Missões</Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  );
}
