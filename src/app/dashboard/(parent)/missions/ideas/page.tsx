
// src/app/dashboard/missions/ideas/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MissionIdeasRedirector() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the main missions page, which now contains the ideas.
        router.replace('/dashboard/missions');
    }, [router]);
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3">Redirecionando para o novo Quadro de Missões...</p>
        </div>
    );
}
