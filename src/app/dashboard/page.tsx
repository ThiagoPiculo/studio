
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './loading';

// This component is designed to be a fast, non-visual redirector.
export default function DashboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Immediately redirect to the primary dashboard view.
        // All logic for what to display (Getting Started vs. Summary) is handled there.
        router.replace('/dashboard/heroes');
    }, [router]);

    // Render a minimal loading state to avoid showing any previous page content.
    // This will be seen for only a fraction of a second.
    return <Loading />;
}
