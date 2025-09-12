
"use client";

import { useParams } from 'next/navigation';
import { Medal } from 'lucide-react';
import { ChildBottomNavbar } from '@/components/dashboard/child/ChildBottomNavbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ChildAchievementsPage() {
    const params = useParams();
    const childId = params.childId as string;

    return (
        <div className="p-4 pb-24 space-y-6">
            <header className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Medal className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold font-headline">Conquistas</h1>
            </header>

            <Card className="text-center py-16">
                 <CardContent>
                    <Medal className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle className="text-xl">Em Breve!</CardTitle>
                    <CardDescription className="mt-2">
                        Seu mural de medalhas e troféus está sendo polido. Volte logo para ver suas grandes conquistas!
                    </CardDescription>
                </CardContent>
            </Card>

            <ChildBottomNavbar childId={childId} />
        </div>
    );
}
