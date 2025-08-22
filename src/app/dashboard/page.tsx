
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This component is designed to be a fast, non-visual redirector.
// It avoids rendering a <Loading /> component to prevent any layout flash.
export default function DashboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Immediately redirect to the primary dashboard view.
        // All logic for what to display (Getting Started vs. Summary) is handled there.
        router.replace('/dashboard/heroes');
    }, [router]);

    // Render nothing while the redirect is happening.
    return null;
}
