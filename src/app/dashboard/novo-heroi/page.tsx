
"use client";

import { OnboardingForm } from '@/components/dashboard/onboarding/OnboardingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getChildProfilesByOwner } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { Suspense } from 'react';

// Custom Rocket Icon to match the screenshot
const OnboardingIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-primary filter drop-shadow-lg">
        <path d="M26.6667 20C26.6667 16.3181 29.6515 13.3333 33.3333 13.3333H56.6667C60.3486 13.3333 63.3333 16.3181 63.3333 20V33.3333C63.3333 37.0152 60.3486 40 56.6667 40H40L26.6667 50V20Z" fill="currentColor" fillOpacity="0.5"/>
        <path d="M16.6667 40C16.6667 36.3181 19.6515 33.3333 23.3333 33.3333H46.6667C50.3486 33.3333 53.3333 36.3181 53.3333 40V53.3333C53.3333 57.0152 50.3486 60 46.6667 60H30L16.6667 70V40Z" fill="currentColor"/>
    </svg>
);


function NovoHeroiPageContent() {
  return (
    <div className="container mx-auto max-w-4xl py-8">
       <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
         <OnboardingForm />
      </Suspense>
    </div>
  );
}

export default function NovoHeroiPage() {
    return <NovoHeroiPageContent />;
}
