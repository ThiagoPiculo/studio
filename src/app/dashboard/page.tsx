
"use client";

import { Suspense } from 'react';
import Loading from './loading';
import { SpaceSelector } from '@/components/dashboard/SpaceSelector';

export default function DashboardRootPage() {
    return (
        <Suspense fallback={<Loading />}>
            <SpaceSelector />
        </Suspense>
    );
}
