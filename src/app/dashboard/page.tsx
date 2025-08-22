"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './loading';

export default function DashboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Immediately redirect to the primary dashboard view.
        // The logic to display getting started vs. summary is handled there.
        router.replace('/dashboard/heroes');
    }, [router]);

    // Render a loading state while the redirect happens.
    return <Loading />;
}
