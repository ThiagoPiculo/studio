
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Suspense } from 'react';
import Loading from "./loading";
import SpaceSelector from "@/components/dashboard/SpaceSelector";


export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { isLoading: familyLoading } = useFamily();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // This effect handles redirection based on loading states
    useEffect(() => {
        if (!isClient) return;

        if (!authLoading && !user) {
            router.replace('/auth/login');
        }
    }, [isClient, authLoading, user, router]);

    // This effect handles showing the space selector or redirecting once everything is loaded
    useEffect(() => {
        if (authLoading || familyLoading) return;

    }, [authLoading, familyLoading, router]);

    if (authLoading || familyLoading || !isClient) {
        return <Loading />;
    }

    return (
        <Suspense fallback={<Loading />}>
            <SpaceSelector />
        </Suspense>
    );
}
