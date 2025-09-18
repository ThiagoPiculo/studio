
"use client";

import { CreateAllianceCard } from "@/components/dashboard/family/CreateAllianceCard";
import { JoinAllianceCard } from "@/components/dashboard/family/JoinAllianceCard";
import { Separator } from "@/components/ui/separator";
import { Link as LinkIcon, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function FamilyPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-headline font-bold">Junte-se ou Crie uma Aliança</h2>
              <p className="text-muted-foreground">Colabore com outros responsáveis para guiar a jornada dos seus Mini Herois.</p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <JoinAllianceCard />
            <CreateAllianceCard />
        </div>

        <Separator />

        <div className="text-center">
             <Button variant="link" asChild>
                <Link href="/dashboard/alliances">
                    Ver minhas Alianças
                </Link>
             </Button>
        </div>
    </div>
  );
}
