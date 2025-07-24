
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirector() {
    const router = useRouter();

    useEffect(() => {
        // The dashboard page logic has been moved to `/dashboard`. 
        // This component now only redirects to `/dashboard/mural`.
        router.replace('/dashboard');
    }, [router]);
    
    // Render nothing or a loading indicator while redirecting
    return null;
}
