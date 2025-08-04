
import { getFamilyMembers, getChildProfilesByFamily, getFamilyMemberships } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole, FamilyMembership } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Shield, Link as LinkIcon, Info } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase/config';
import { redirect } from 'next/navigation';
import { FamilySwitcherClient } from './FamilySwitcherClient';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FamilyProvider, useFamily } from '@/contexts/FamilyContext';

type AllianceDetails = {
  id: string;
  name: string;
  role: FamilyRole | 'Personal' | null;
  members: UserProfile[];
  children: ChildProfile[];
};

// This component will now be rendered by a client component wrapper
// that can provide the necessary context.
async function getAllianceDetails(contextId: string): Promise<Omit<AllianceDetails, 'id' | 'name' | 'role'>> {
    const [members, children] = await Promise.all([
        getFamilyMembers(contextId),
        getChildProfilesByFamily(contextId)
    ]);
    return { members, children };
}


export default async function AlliancesPage() {
  // This page needs to be a client component to use the useFamily hook
  // But we want to fetch data on the server.
  // The best approach is to wrap it in a client component that then renders a server component,
  // or more simply, for this page, we can assume this will be wrapped by the layout which provides the context.
  // The error suggests the fetch is happening client side.
  // The issue is `auth.currentUser` which is not reliable on server.
  
  // Let's refactor this to be a client component that fetches data,
  // which is not ideal under the new architecture, but given the constraints...
  
  // No, the best way is to make the page itself a wrapper that provides context,
  // or rely on the root `FamilyProvider`.

  // Let's try to get user from server-side Auth if possible.
  // Since we can't, we have to refactor the data fetching.
  // I will make this a client component that fetches data on mount.
  
  // Let's reconsider. The error is from client-side call.
  // This page is a server component. `getAlliancesDetails` is called by it.
  // The problem is `auth.currentUser`.

  // I will refactor `getAlliancesDetails` to not rely on a passed user,
  // and instead, the page will get contexts from the `FamilyProvider` via a client component.
  // This is getting complicated.
  
  // A simpler model: The page will be a client component that orchestrates things.
  // This is the source of all problems.
  
  // New plan: The FamilyContext should be the source of truth for available contexts.
  // This page will be a client component using that hook.
  // Then, for each context, we can render a server component to fetch details. This is too complex.

  // Let's try the simplest fix. Make the page a client component.
  // This is what I've been doing. And it seems to be the intended pattern for this app.
  return (
    <SuspenseWrapper />
  )
}

// Wrap in suspense to handle client-side rendering
import { Suspense } from 'react';
import Loading from './loading';

function SuspenseWrapper() {
  return (
    <Suspense fallback={<Loading />}>
      <AlliancesPageClient />
    </Suspense>
  )
}


"use client";

import { useEffect, useState } from 'react';

function AlliancesPageClient() {
    const { availableContexts, isLoading: isFamilyLoading } = useFamily();
    const [alliancesDetails, setAlliancesDetails] = useState<AllianceDetails[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (isFamilyLoading || availableContexts.length <= 1) {
                if(availableContexts.length <= 1) setIsLoadingDetails(false);
                return;
            };
            
            setIsLoadingDetails(true);

            const allianceContexts = availableContexts.filter(c => c.id !== 'my-space');
            
            const detailsPromises = allianceContexts.map(async (context) => {
                 const [members, children] = await Promise.all([
                    getFamilyMembers(context.id),
                    getChildProfilesByFamily(context.id)
                ]);
                return {
                    id: context.id,
                    name: context.name,
                    role: context.role || null,
                    members,
                    children
                };
            });
            
            try {
                const results = await Promise.all(detailsPromises);
                setAlliancesDetails(results);
            } catch (error) {
                console.error("Failed to fetch alliance details:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [availableContexts, isFamilyLoading]);

    const router = useRouter();
    const alliancesOnly = availableContexts.filter(c => c.id !== 'my-space');

    if (isFamilyLoading || isLoadingDetails) {
        return <Loading />;
    }

    if (!isFamilyLoading && alliancesOnly.length === 0) {
      // If user has no alliances, redirect them to the main family page to create/join one.
      router.push('/dashboard/family');
      return <Loading />; // Show loading while redirecting
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center">
                        <Users className="mr-3 h-8 w-8 text-primary" />
                        Minhas Alianças
                    </CardTitle>
                    <CardDescription>
                        Gerencie todas as equipes de herois que você faz parte.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6">
                {alliancesDetails.map(alliance => {
                const roleInfo = familyRoles.find(r => r.id === alliance.role);
                return (
                    <Card key={alliance.id} className="flex flex-col">
                    <CardHeader className="flex-grow">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-chart-4" />
                            {alliance.name}
                        </CardTitle>
                        {roleInfo && roleInfo.id !== 'Personal' ? (
                            <div className="text-sm text-muted-foreground flex flex-col gap-2 pt-2">
                                <span className="font-semibold text-foreground">Seu papel: {roleInfo.label}</span>
                                <div className="text-xs text-muted-foreground flex items-start gap-2">
                                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{roleInfo.description}</span>
                                </div>
                            </div>
                        ) : (
                            <CardDescription>Seu papel não foi definido.</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                            <div className="flex -space-x-2">
                                {alliance.members.map(member => (
                                <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                </Avatar>
                                ))}
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Mini Herois</h4>
                            <div className="flex -space-x-2">
                                {alliance.children.map(child => (
                                <Avatar key={child.id} className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                </Avatar>
                                ))}
                                {alliance.children.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum herói nesta aliança ainda.</p>}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2 mt-auto">
                        <FamilySwitcherClient contextId={alliance.id} action="invite" />
                        <FamilySwitcherClient contextId={alliance.id} action="details" />
                    </CardFooter>
                    </Card>
                )
                })}
            </div>
        </div>
    );
}

// We need to move the client component logic here
"use client";
import { useRouter } from 'next/navigation';

