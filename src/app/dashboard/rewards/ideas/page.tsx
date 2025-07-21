
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is now deprecated in favor of the main rewards page logic.
// It will redirect users to the main rewards page.
export default function RewardIdeasRedirector() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/rewards');
    }, [router]);
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3">Redirecionando para a Lojinha...</p>
        </div>
    );
}
