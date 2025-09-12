
'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getFamilyMembers, getFamilyById, getPendingJoinRequestsForFamily, getFamilyMemberships } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole, Family, FamilyInvitation, FamilyMembership } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowLeft, Shield, Link as LinkIcon, Info, HelpCircle, Copy, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Loading from './loading';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { InviteMemberDialog } from '@/components/dashboard/family/InviteMemberDialog';
import { MemberSettings } from '@/components/dashboard/family/MemberSettings';
import { Badge } from '@/components/ui/badge';

function AllianceManagementPage() {
    const { user, loading: authLoading } = useAuth();
    const { currentRole, isLoading: isFamilyLoading } = useFamily();
    const params = useParams();
    const allianceId = params.allianceId as string;
    const { toast } = useToast();
    const router = useRouter();

    const [alliance, setAlliance] = useState<Family | null>(null);
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
    const [joinRequests, setJoinRequests] = useState<FamilyInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    const isOwner = useMemo(() => currentRole === 'Owner', [currentRole]);

    const fetchData = useCallback(async () => {
        if (!allianceId || !user) {
            router.push('/dashboard/alliances');
            return;
        }

        setIsLoading(true);
        try {
            const [allianceData, membersData, membershipsData, requestsData] = await Promise.all([
                getFamilyById(allianceId),
                getFamilyMembers(allianceId),
                getFamilyMemberships(allianceId),
                isOwner ? getPendingJoinRequestsForFamily(allianceId) : Promise.resolve([]),
            ]);

            if (!allianceData || !membersData.some(m => m.uid === user.uid)) {
                 toast({ title: "Acesso Negado", description: "Você não faz parte desta aliança.", variant: "destructive" });
                 router.push('/dashboard/alliances');
                 return;
            }

            setAlliance(allianceData);
            setMembers(membersData);
            setMemberships(membershipsData);
            setJoinRequests(requestsData);

        } catch (error) {
            console.error("Failed to fetch alliance data:", error);
            toast({ title: "Erro ao carregar Aliança", variant: "destructive" });
            router.push('/dashboard/alliances');
        } finally {
            setIsLoading(false);
        }
    }, [allianceId, user, router, toast, isOwner]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Código Copiado!", description: "Pronto para chamar reforços!" });
    };

    if (isLoading || authLoading || isFamilyLoading) {
        return <Loading />;
    }

    if (!alliance) {
        return <div>Aliança não encontrada.</div>;
    }
    
    const membersWithRoles = members.map(member => {
        const membership = memberships.find(m => m.userId === member.uid);
        return {
            ...member,
            role: membership?.role || 'Guardian' // Default to Guardian if somehow missing
        };
    });

    const currentUserAsMember = membersWithRoles.find(m => m.uid === user?.uid);
    const owner = membersWithRoles.find(m => m.uid === alliance.ownerId && m.uid !== user?.uid);
    const otherMembers = membersWithRoles.filter(m => m.uid !== alliance.ownerId && m.uid !== user?.uid);


    return (
        <>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LinkIcon className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="text-3xl font-headline font-bold">{alliance.name}</h2>
                            <p className="text-muted-foreground">Gerencie sua equipe de heróis e colaboradores.</p>
                        </div>
                    </div>
                     <Button asChild variant="outline">
                        <Link href="/dashboard/alliances"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Informações da Aliança</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted border">
                            <span className="text-sm font-semibold">Código de Convite:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-lg tracking-widest text-primary">{alliance.inviteCode}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyCode(alliance.inviteCode)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Membros da Aliança ({members.length})</CardTitle>
                        <CardDescription>Gerencie os papéis e o acesso dos colaboradores.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentUserAsMember && (
                            <>
                                <h3 className="text-sm font-semibold text-muted-foreground">Seu Perfil</h3>
                                <MemberSettings member={currentUserAsMember} isOwner={currentUserAsMember.uid === alliance.ownerId} />
                                <Separator className="my-6"/>
                            </>
                        )}
                        
                        {owner && (
                            <>
                                <h3 className="text-sm font-semibold text-muted-foreground">Proprietário</h3>
                                <MemberSettings member={owner} isOwner={true} />
                                <Separator className="my-6"/>
                            </>
                        )}
                        
                        {otherMembers.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground">Colaboradores</h3>}
                        {otherMembers.map(member => (
                            <MemberSettings key={member.uid} member={member} isOwner={false} />
                        ))}
                    </CardContent>
                     <CardFooter>
                        <Button onClick={() => setIsInviteDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Convidar Membro
                        </Button>
                    </CardFooter>
                </Card>

            </div>
            
            <InviteMemberDialog
                isOpen={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                familyId={alliance.id}
                familyName={alliance.name}
                inviteCode={alliance.inviteCode}
                onInvitationSent={fetchData}
            />
        </>
    );
}

export default function AllianceManagementPageWrapper() {
  return (
    <Suspense fallback={<Loading />}>
      <AllianceManagementPage />
    </Suspense>
  )
}

    