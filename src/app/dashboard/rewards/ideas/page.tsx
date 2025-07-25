
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RewardIdeasRedirector() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/rewards');
    }, [router]);
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3">Redirecionando para o Quadro de Recompensas...</p>
        </div>
    );
}
