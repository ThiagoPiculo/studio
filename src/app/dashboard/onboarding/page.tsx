
"use client";

import { OnboardingForm } from '@/components/dashboard/OnboardingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getChildProfilesByOwner } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';

// Custom Rocket Icon to match the screenshot
const OnboardingIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-primary filter drop-shadow-lg">
        <path d="M26.6667 20C26.6667 16.3181 29.6515 13.3333 33.3333 13.3333H56.6667C60.3486 13.3333 63.3333 16.3181 63.3333 20V33.3333C63.3333 37.0152 60.3486 40 56.6667 40H40L26.6667 50V20Z" fill="currentColor" fillOpacity="0.5"/>
        <path d="M16.6667 40C16.6667 36.3181 19.6515 33.3333 23.3333 33.3333H46.6667C50.3486 33.3333 53.3333 36.3181 53.3333 40V53.3333C53.3333 57.0152 50.3486 60 46.6667 60H30L16.6667 70V40Z" fill="currentColor"/>
    </svg>
);


export default function OnboardingPage() {
  const { user } = useAuth();
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  useEffect(() => {
    const fetchChildrenCount = async () => {
      if (user) {
        setIsLoadingCount(true);
        try {
          const profiles = await getChildProfilesByOwner(user.uid);
          setChildrenCount(profiles.length);
        } catch (error) {
          console.error("Error fetching children count:", error);
          setChildrenCount(0); // Assume 0 on error to be safe
        } finally {
          setIsLoadingCount(false);
        }
      } else {
        setIsLoadingCount(false); // No user, so not loading
      }
    };
    fetchChildrenCount();
  }, [user]);

  const getTitle = () => {
    if (isLoadingCount) return "Carregando...";
    return childrenCount === 0 ? "Vamos Adicionar Seu Primeiro Mini Heroi!" : "Vamos Adicionar Mais um Mini Heroi!";
  };

  const getDescription = () => {
    if (isLoadingCount) return "Aguarde um momento...";
    return childrenCount === 0 
      ? "Toda grande aventura começa com um heroi (ou heroína!). Conte-nos um pouco sobre sua criança para começar." 
      : "A equipe de Mini Herois está crescendo! Conte-nos um pouco sobre a nova criança.";
  };


  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-clay rounded-2xl">
        <CardHeader className="text-center p-6">
          <div className="mb-4 flex justify-center group">
             {isLoadingCount ? <Loader2 className="h-20 w-20 text-primary animate-spin" /> : <OnboardingIcon />}
          </div>
          <CardTitle className="font-headline text-3xl">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
