
// src/app/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import Loading from './loading';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { getChildProfilesForAttribution, getMissionTemplatesByOwnerOrFamily, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';

export default function DashboardRedirectPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading } = useFamily();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || familyLoading) {
            return;
        }

        if (!user) {
            router.replace('/auth/login');
            return;
        }

        const checkInitialState = async () => {
            const hasAlliances = availableContexts.some(c => c.id !== 'my-space');
            
            const preferredInitialPage = user.settings?.initialPage;
            // Se o usuário escolheu uma página específica (diferente de 'default'), vá para ela.
            if (preferredInitialPage && preferredInitialPage !== 'default') {
                router.replace(`/dashboard/${preferredInitialPage}`);
                return;
            }

            // Lógica "Padrão do App"
            const childrenInPersonalSpace = await getChildProfilesForAttribution(user.uid, 'my-space');
            
            // Cenário 1: Novo usuário total
            if (childrenInPersonalSpace.length === 0 && !hasAlliances) {
                 router.replace('/dashboard/heroes'); // Esta página mostrará o Guia de Primeiros Passos
            
            // Cenário 2: Usuário padrão, com filhos no espaço pessoal e sem alianças
            } else if (childrenInPersonalSpace.length > 0 && !hasAlliances) {
                 router.replace(`/dashboard/heroes`);
            
            // Cenário 3 e 4: Usuário é colaborador em alianças, pode ou não ter filhos no espaço pessoal
            } else if (hasAlliances) {
                 router.replace('/dashboard'); // Mostra os cards dos espaços para escolher
            
            // Fallback para qualquer outro caso
            } else {
                router.replace(`/dashboard/heroes`);
            }
        };

        checkInitialState();

    }, [user, authLoading, familyLoading, availableContexts, router]);
    
    // Render a full-page loader while contexts are resolving and redirection is happening.
    return <Loading />;
}
