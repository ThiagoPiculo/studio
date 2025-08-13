
"use client";

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getFamilyMembers, getChildProfilesByFamily, getFamilyById } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole, Family } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Shield, Link as LinkIcon, Info, HelpCircle, Copy, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Loading from './loading';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { useToast } from '@/hooks/use-toast';
import { InviteMemberDialog } from '@/components/dashboard/family/InviteMemberDialog';


type AllianceDetails = {
  id: string;
  name: string;
  inviteCode: string;
  role: FamilyRole | 'Personal' | null;
  members: UserProfile[];
  children: ChildProfile[];
  owner: UserProfile | null;
};

function FamilySwitcherClient({ contextId, action }: { contextId: string; action: 'details' }) {
    const { setCurrentContext } = useFamily();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        setCurrentContext(contextId);
        router.push('/dashboard/family');
    };

    return (
        <Button onClick={handleClick} disabled={isLoading}>
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Gerenciar Aliança <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
    )
}


function AlliancesPageClient() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: isFamilyLoading } = useFamily();
    const [alliancesDetails, setAlliancesDetails] = useState<AllianceDetails[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const { toast } = useToast();

    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [allianceToInvite, setAllianceToInvite] = useState<{ id: string, name: string, inviteCode: string } | null>(null);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Código Copiado!", description: "Pronto para chamar reforços!" });
    };
    
    const handleInviteClick = (alliance: { id: string, name: string, inviteCode: string }) => {
        setAllianceToInvite(alliance);
        setIsInviteDialogOpen(true);
    };

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
                     const [members, children, familyDetails] = await Promise.all([
                        getFamilyMembers(context.id),
                        getChildProfilesByFamily(context.id),
                        getFamilyById(context.id)
                    ]);
                    const owner = members.find(m => m.uid === familyDetails?.ownerId) || null;
                    return {
                        id: context.id,
                        name: context.name,
                        inviteCode: familyDetails?.inviteCode || '------',
                        role: context.role || null,
                        members,
                        children,
                        owner
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
        <>
            <div className="space-y-8">
                 <div className="flex items-center gap-2">
                    <LinkIcon className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-headline font-bold">Minhas Alianças</h2>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                             <div className="space-y-3">
                                <h4 className="font-medium leading-none">Gerenciando suas Equipes</h4>
                                <p className="text-sm text-muted-foreground">
                                  Esta tela centraliza todas as Alianças das quais você faz parte. Cada card representa uma equipe de colaboração para gerenciar um ou mais Mini Herois.
                                </p>
                                 <ul className="text-sm text-muted-foreground space-y-2">
                                    <li><strong className="text-foreground">Ver Detalhes:</strong> Acesse o painel de uma aliança para ver os membros, os heróis associados e gerenciar as configurações.</li>
                                    <li><strong className="text-foreground">Convidar:</strong> Use o botão "Convidar" para adicionar novos colaboradores diretamente a uma aliança específica.</li>
                                    <li><strong className="text-foreground">Criar/Entrar:</strong> Para criar uma nova aliança ou entrar em uma com um código, você precisa primeiro voltar para "Cuidar Solo" através do seletor de contexto no topo da página.</li>
                                 </ul>
                                <PopoverClose asChild>
                                    <Button className="w-full">Entendi 👍</Button>
                                </PopoverClose>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
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
                        const otherMembers = alliance.members.filter(m => m.uid !== alliance.owner?.uid);

                        return (
                            <Card key={alliance.id} className="flex flex-col">
                            <CardHeader className="flex-grow">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <LinkIcon className="h-5 w-5 text-chart-4" />
                                    {alliance.name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 text-xs pt-1">
                                    Cód. Convite: 
                                    <span className="font-mono font-semibold text-foreground tracking-widest text-lg">{alliance.inviteCode}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(alliance.inviteCode)}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </CardDescription>
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
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Proprietário</h4>
                                        {alliance.owner ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={alliance.owner.avatarUrl ?? undefined} alt={alliance.owner.name || ''} />
                                                    <AvatarFallback>{getInitials(alliance.owner.name)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium truncate">{alliance.owner.name}</span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Não definido</p>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                                        <div className="flex -space-x-2">
                                            {otherMembers.length > 0 ? (
                                                otherMembers.map(member => (
                                                    <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                                                        <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                                                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                    </Avatar>
                                                ))
                                            ) : (
                                                 <p className="text-xs text-muted-foreground italic">Nenhum.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2 mt-auto">
                                <Button variant="outline" onClick={() => handleInviteClick(alliance)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Convidar
                                </Button>
                                <FamilySwitcherClient contextId={alliance.id} action="details" />
                            </CardFooter>
                            </Card>
                        )
                        })}
                    </div>
                )}
            </div>
            {allianceToInvite && (
                <InviteMemberDialog
                    isOpen={isInviteDialogOpen}
                    onOpenChange={setIsInviteDialogOpen}
                    familyId={allianceToInvite.id}
                    familyName={allianceToInvite.name}
                    inviteCode={allianceToInvite.inviteCode}
                />
            )}
        </>
    );
}

export default function AlliancesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AlliancesPageClient />
    </Suspense>
  )
}
