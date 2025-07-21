
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function EditRewardTemplateRedirector() {
    const router = useRouter();
    const params = useParams();
    const rewardId = params.rewardId as string;

    useEffect(() => {
        if (rewardId) {
            router.replace(`/dashboard/rewards/edit-template/${rewardId}`);
        } else {
            router.replace('/dashboard/rewards');
        }
    }, [rewardId, router]);
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3">Redirecionando...</p>
        </div>
    );
}
