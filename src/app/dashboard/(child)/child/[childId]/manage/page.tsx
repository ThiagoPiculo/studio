
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageChildRedirector() {
    const router = useRouter();

    useEffect(() => {
        // This component now only redirects.
        // The logic has been moved to /dashboard/mural
        const params = new URLSearchParams(window.location.search);
        const childId = window.location.pathname.split('/').find(segment => segment && segment !== 'dashboard' && segment !== 'child' && segment !== 'manage');
        
        if (childId) {
            params.set('childId', childId);
            router.replace(`/dashboard/mural?${params.toString()}`);
        } else {
            // Fallback if no childId is found in URL
            router.replace('/dashboard/heroes');
        }
    }, [router]);
    
    // Render nothing or a loading indicator while redirecting
    return null;
}
