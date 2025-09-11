
"use client";

import { OnboardingForm } from '@/components/dashboard/onboarding/OnboardingForm';

export default function AssistantPage() {
    // This page is now a wrapper for the new onboarding form.
    // The previous content is replaced by the new guided flow.
    return (
      <div className="py-8">
        <OnboardingForm />
      </div>
    );
}
