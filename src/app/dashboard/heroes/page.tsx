
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';

function HeroesPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, isLoading: isFamilyLoading } = useFamily();
    const [children, setChildren] = useState<ChildProfile[] | null>(null);
    const [missions, setMissions] = useState<MissionInstance[] | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            // Se não há usuário e a autenticação já terminou, significa que ele não está logado.
            // Limpamos os dados para evitar mostrar conteúdo antigo.
            setChildren([]);
            setMissions([]);
            return;
        };

        // Adicionamos um estado local de carregamento para a busca de dados em si
        // Isso evita que a UI pisque se o contexto mudar rapidamente.
        try {
            const [childData, missionData] = await Promise.all([
              getChildProfilesForAttribution(user.uid, currentContext),
              getMissionInstancesForContext(user.uid, currentContext)
            ]);
            setChildren(childData);
            setMissions(missionData);
        } catch (error) {
            console.error("Error fetching heroes data:", error);
            setChildren([]);
            setMissions([]);
        }
    }, [user, currentContext]);

    useEffect(() => {
        // A condição é clara: SÓ busca os dados quando a autenticação E o contexto da família estiverem prontos.
        if (!authLoading && !isFamilyLoading) {
            fetchData();
        }
    }, [authLoading, isFamilyLoading, fetchData]);

    // O estado de carregamento agora considera os contextos e a busca de dados.
    if (authLoading || isFamilyLoading || children === null || missions === null) {
        return <Loading />;
    }
    
    // Se, após tudo carregar, não houver crianças, exibe o guia de introdução.
    if (children.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false}
                hasRewards={false}
            />
        );
    }
    
    // Uma vez que todos os dados estão prontos, renderiza o resumo.
    return <HeroesSummary children={children} missionInstances={missions} />;
}


export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesPageContent />
        </Suspense>
    )
}
