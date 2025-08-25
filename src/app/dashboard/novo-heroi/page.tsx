
"use client";

import { OnboardingForm } from '@/components/dashboard/onboarding/OnboardingForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function NovoHeroiPageContent() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <OnboardingForm />
    </Suspense>
  );
}

export default function NovoHeroiPage() {
    return <NovoHeroiPageContent />;
}
