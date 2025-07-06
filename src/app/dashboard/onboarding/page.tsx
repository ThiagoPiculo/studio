
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
        <path d="M40 8.33331C40 8.33331 51.6667 8.33331 56.6667 15.8333C61.6667 23.3333 56.6667 36.6666 45.8333 44.1666C35 51.6666 21.6667 56.6666 14.1667 51.6666C6.66667 46.6666 6.66667 35 15.8333 28.3333C25 21.6666 40 8.33331 40 8.33331Z" fill="currentColor" fillOpacity="0.5"/>
        <path d="M51.6667 25C51.6667 25 65.8333 25.8333 69.1667 33.3333C72.5 40.8333 65.8333 50.8333 55.8333 55.8333C45.8333 60.8333 34.1667 61.6666 28.3333 55.8333C22.5 50 25.8333 39.1666 35 34.1666C44.1667 29.1666 51.6667 25 51.6667 25Z" fill="currentColor"/>
        <path d="M30 67.5C30 67.5 25.8333 70 25.8333 65C25.8333 60 30 57.5 30 57.5L42.5 47.5L52.5 57.5L40 67.5L30 67.5Z" fill="currentColor" fillOpacity="0.5"/>
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
