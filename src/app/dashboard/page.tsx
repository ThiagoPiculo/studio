
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Loading from './loading';
import { DashboardClientPage } from '@/components/dashboard/dashboard/DashboardClientPage';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';

export default function DashboardPage() {
    const { loading: authLoading } = useAuth();
    const { isLoading: isFamilyLoading } = useFamily();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!authLoading && !isFamilyLoading) {
            setIsReady(true);
        }
    }, [authLoading, isFamilyLoading]);

    if (!isReady) {
        return <Loading />;
    }

    return (
        <Suspense fallback={<Loading />}>
            <DashboardClientPage />
        </Suspense>
    );
}
