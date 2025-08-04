
"use client";

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getFamilyMembers, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Shield, Link as LinkIcon, Info } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { FamilySwitcherClient } from './FamilySwitcherClient';
import Loading from './loading';
import Link from 'next/link';

type AllianceDetails = {
  id: string;
  name: string;
  role: FamilyRole | 'Personal' | null;
  members: UserProfile[];
  children: ChildProfile[];
};

function AlliancesPageClient() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: isFamilyLoading } = useFamily();
    const [alliancesDetails, setAlliancesDetails] = useState<AllianceDetails[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (authLoading || isFamilyLoading) {
            return;
        }

        const fetchDetails = async () => {
            if (!user) {
                setIsLoadingDetails(false);
                return;
            }

            const allianceContexts = availableContexts.filter(c => c.id !== 'my-space');
            
            if (allianceContexts.length === 0) {
              setIsLoadingDetails(false);
              return;
            }
            
            setIsLoadingDetails(true);
            
            try {
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
                const results = await Promise.all(detailsPromises);
                setAlliancesDetails(results);
            } catch (error) {
                console.error("Failed to fetch alliance details:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [availableContexts, isFamilyLoading, authLoading, user]);

    if (authLoading || isFamilyLoading || isLoadingDetails) {
        return <Loading />;
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
            
            {alliancesDetails.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <p>Você ainda não faz parte de nenhuma Aliança.</p>
                        <Button variant="link" asChild className="p-0 h-auto mt-2">
                           <Link href="/dashboard/family?action=create">
                                Crie uma nova aliança para colaborar
                           </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
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
            )}
        </div>
    );
}

export default function AlliancesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AlliancesPageClient />
    </Suspense>
  )
}
