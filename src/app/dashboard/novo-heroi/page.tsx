
"use client";

import { OnboardingForm } from '@/components/dashboard/onboarding/OnboardingForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function NovoHeroiPageContent() {
  return (
    <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
       <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
         <OnboardingForm />
      </Suspense>
    </div>
  );
}

export default function NovoHeroiPage() {
    return <NovoHeroiPageContent />;
}
