
'use client';

import { Suspense, useMemo } from 'react';
import Loading from './loading';
import { MuralCompletoPageContent } from './MuralCompletoPageContent';

export default function MuralCompleto() {
    return (
        <Suspense fallback={<Loading />}>
            <MuralCompletoPageContent />
        </Suspense>
    )
}
