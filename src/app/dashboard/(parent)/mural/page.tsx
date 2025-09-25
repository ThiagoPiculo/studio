
"use client";

import { Suspense } from 'react';
import Loading from './loading';
import { MuralCompletoPageContent } from '@/components/dashboard/mural/MuralCompletoPageContent';


export default function MuralCompleto() {
    return (
        <Suspense fallback={<Loading />}>
            <MuralCompletoPageContent />
        </Suspense>
    )
}
