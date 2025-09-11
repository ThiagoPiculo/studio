
'use client';

import { Suspense } from 'react';
import Loading from './loading';
import { ChildDashboard } from '@/components/dashboard/child/ChildDashboard';

function ChildDashboardPage() {
    return <ChildDashboard />;
}


export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <ChildDashboardPage />
        </Suspense>
    );
}
