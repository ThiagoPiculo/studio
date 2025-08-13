
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getChildProfilesByOwner } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, PlusCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Loading from '../loading';

function CuidandoSoloPageContent() {
    const { user, loading: authLoading } = useAuth();
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchSoloChildren = async () => {
            setIsLoading(true);
            try {
                // Fetch only children in "Meu Espaço" (familyId is null)
                const soloChildren = await getChildProfilesByOwner(user.uid, true);
                setChildren(soloChildren.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching solo children:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSoloChildren();
    }, [user, authLoading]);

    if (isLoading || authLoading) {
        return <Loading />;
    }

    if (children.length > 0) {
        return (
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-6 w-6 text-primary"/>
                            Mini Herois no Meu Espaço
                        </CardTitle>
                        <CardDescription>Estes são os heróis que você gerencia pessoalmente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {children.map(child => (
                                <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <Avatar
                                            className="h-10 w-10 text-lg ring-2 ring-offset-background ring-[var(--ring-color)] flex-shrink-0"
                                            style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                        >
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                                                {getInitials(child.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <span className="font-semibold truncate block">{child.name}</span>
                                            <p className="text-sm text-muted-foreground">Nível: {child.level}</p>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/mural?childId=${child.id}`}>
                                        <Button variant="ghost" size="sm">
                                            Ver Painel <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="shadow-lg bg-gradient-to-br from-card to-primary/5">
                <CardHeader className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-primary mb-2" />
                    <CardTitle className="text-3xl font-headline">Seu Co-piloto na Jornada Heroica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-lg text-muted-foreground">
                        Sabemos que a jornada de cuidar solo é cheia de superpoderes, mas também de muitos pratinhos para equilibrar. O Mini Herois foi pensado para ser seu parceiro, ajudando a organizar a rotina, a diminuir a carga mental do "o que temos que fazer agora?" e a criar um canal de comunicação divertido e visual com seus filhos. Deixe a gente cuidar da estrutura, para que você possa focar nas memórias.
                    </p>
                    <div className="text-center">
                         <Link href="/dashboard/novo-heroi">
                            <Button size="lg" className="bg-primary text-primary-foreground shadow-lg animate-pulse">
                                <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Primeiro Herói
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Transforme a Rotina em uma Aventura Divertida</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Cansada de repetir as mesmas coisas todos os dias? Transforme o 'escovar os dentes' ou 'fazer a lição' em missões heroicas! Com nosso sistema de gamificação, você usa a linguagem que as crianças amam (estrelas, níveis, recompensas) para motivá-las a cumprir suas responsabilidades de forma autônoma. É menos estresse para você, e mais diversão para eles.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CuidandoSoloPage() {
    return <CuidandoSoloPageContent />;
}
