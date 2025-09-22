
'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getFamilyMembers, getFamilyById, getPendingJoinRequestsForFamily, getFamilyMemberships, getChildProfilesByFamily, moveChildToNewContext, updateFamilyName, deleteFamily, getChildProfilesByOwner, approveJoinRequest, declineJoinRequest, getUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole, Family, FamilyInvitation, FamilyMembership } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowLeft, Shield, Link as LinkIcon, Info, HelpCircle, Copy, Loader2, Crown, Trash2, Move, Settings, UserX, Edit, AlertTriangle, Check, X } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Loading from './loading';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { InviteMemberDialog } from '@/components/dashboard/family/InviteMemberDialog';
import { MemberSettings } from '@/components/dashboard/family/MemberSettings';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface EnrichedFamilyInvitation extends FamilyInvitation {
  inviteeAvatarUrl?: string | null;
}

function AllianceManagementPage() {
    const { user, loading: authLoading } = useAuth();
    const { currentRole, isLoading: isFamilyLoading, availableContexts, setCurrentContext } = useFamily();
    const params = useParams();
    const allianceId = params.allianceId as string;
    const { toast } = useToast();
    const router = useRouter();

    const [alliance, setAlliance] = useState<Family | null>(null);
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
    const [joinRequests, setJoinRequests] = useState<EnrichedFamilyInvitation[]>([]);
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [soloChildren, setSoloChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    
    const [childToRemove, setChildToRemove] = useState<ChildProfile | null>(null);
    const [childToMove, setChildToMove] = useState<ChildProfile | null>(null);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [isAddToAllianceDialogOpen, setIsAddToAllianceDialogOpen] = useState(false);
    const [childrenToAddToAlliance, setChildrenToAddToAlliance] = useState<string[]>([]);
    const [selectedMoveContext, setSelectedMoveContext] = useState<string>('');
    const [isActionProcessing, setIsActionProcessing] = useState<string | null>(null);

    const [isEditNameOpen, setIsEditNameOpen] = useState(false);
    const [newAllianceName, setNewAllianceName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
    const [isDeletingAlliance, setIsDeletingAlliance] = useState(false);


    const isOwner = useMemo(() => alliance?.ownerId === user?.uid, [alliance, user]);

    const fetchData = useCallback(async () => {
        if (!allianceId || !user) {
            router.push('/dashboard/alliances');
            return;
        }

        setIsLoading(true);
        try {
            const [allianceData, membersData, membershipsData, requestsData, childrenData, soloChildrenData] = await Promise.all([
                getFamilyById(allianceId),
                getFamilyMembers(allianceId),
                getFamilyMemberships(allianceId),
                getPendingJoinRequestsForFamily(allianceId),
                getChildProfilesByFamily(allianceId),
                getChildProfilesByOwner(user.uid, true),
            ]);

            if (!allianceData || !membersData.some(m => m.uid === user.uid)) {
                 toast({ title: "Acesso Negado", description: "Você não faz parte desta aliança.", variant: "destructive" });
                 router.push('/dashboard/alliances');
                 return;
            }

            setAlliance(allianceData);
            setNewAllianceName(allianceData.name);
            setMembers(membersData);
            setMemberships(membershipsData);
            
            // Enrich join requests with avatar data
            const enrichedRequests = await Promise.all(
                requestsData.map(async (req) => {
                    if (req.type === 'request') { // 'request' type, where inviterName is the requester
                        const requesterProfile = await getUserProfile(req.inviteeId);
                        return { ...req, inviteeAvatarUrl: requesterProfile?.avatarUrl };
                    }
                    return req;
                })
            );

            setJoinRequests(enrichedRequests);
            setChildren(childrenData);
            setSoloChildren(soloChildrenData);

        } catch (error) {
            console.error("Failed to fetch alliance data:", error);
            toast({ title: "Erro ao carregar Aliança", variant: "destructive" });
            router.push('/dashboard/alliances');
        } finally {
            setIsLoading(false);
        }
    }, [allianceId, user, router, toast]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Código Copiado!", description: "Pronto para chamar reforços!" });
    };

    const handleRemoveFromAlliance = async () => {
        if (!childToRemove || !user) return;
        setIsActionProcessing(childToRemove.id);
        try {
            // Move child to their owner's personal space (familyId: null)
            await moveChildToNewContext(childToRemove.id, null, user);
            toast({ title: "Herói Removido da Aliança", description: `${childToRemove.name} agora está no espaço pessoal de seu criador.` });
            setChildren(prev => prev.filter(c => c.id !== childToRemove.id));
        } catch (error: any) {
            console.error("Error removing child from alliance:", error);
            toast({ title: "Erro ao Remover", description: error.message || "Não foi possível remover o herói da aliança.", variant: "destructive" });
        } finally {
            setIsActionProcessing(null);
            setChildToRemove(null);
        }
    };
    
    const handleMoveHeroi = async () => {
        if (!user || !childToMove || !selectedMoveContext) {
          toast({ title: 'Erro', description: 'Dados insuficientes para mover o heroi.', variant: 'destructive' });
          return;
        }
        setIsActionProcessing(childToMove.id);
        try {
          await moveChildToNewContext(childToMove.id, selectedMoveContext, user);
    
          toast({
            title: 'Herói Movido com Sucesso!',
            description: `${childToMove.name} agora pertence a uma nova aliança.`,
          });
          setChildren(prev => prev.filter(c => c.id !== childToMove.id));
        } catch (error: any) {
          console.error("Error moving child profile:", error);
          toast({ title: 'Erro ao Mover', description: error.message, variant: 'destructive' });
        } finally {
          setIsActionProcessing(null);
          setIsMoveDialogOpen(false);
          setChildToMove(null);
        }
    };
    
     const handleUpdateName = async () => {
        if (!alliance || !user || !newAllianceName.trim()) return;
        setIsSavingName(true);
        try {
            await updateFamilyName(alliance.id, user.uid, newAllianceName.trim());
            setAlliance(prev => prev ? { ...prev, name: newAllianceName.trim() } : null);
            toast({ title: 'Nome da Aliança Atualizado!' });
            setIsEditNameOpen(false);
        } catch (error: any) {
            toast({ title: 'Erro ao Atualizar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleDeleteAlliance = async () => {
        if (!alliance || !user || deleteConfirmationInput !== alliance.name) {
            toast({ title: 'Confirmação Incorreta', description: 'Você deve digitar o nome exato da aliança para confirmar.', variant: 'destructive' });
            return;
        }
        setIsDeletingAlliance(true);
        try {
            await deleteFamily(alliance.id, user);
            toast({ title: 'Aliança Excluída', description: 'A aliança e todas as suas associações foram removidas.' });
            router.push('/dashboard/alliances');
        } catch (error: any) {
            toast({ title: 'Erro ao Excluir', description: error.message, variant: 'destructive' });
            setIsDeletingAlliance(false);
        }
    };
    
    const handleAddChildrenToAlliance = async () => {
        if (!user || childrenToAddToAlliance.length === 0) {
            toast({ title: "Nenhum herói selecionado", variant: "default" });
            return;
        }
        setIsActionProcessing('add-to-alliance');
        try {
            const movePromises = childrenToAddToAlliance.map(childId => moveChildToNewContext(childId, allianceId, user));
            await Promise.all(movePromises);

            toast({ title: "Heróis Adicionados!", description: `${childrenToAddToAlliance.length} herói(s) foram movidos para esta aliança.` });
            
            // Refetch all data to update the UI correctly
            fetchData();
            setIsAddToAllianceDialogOpen(false);
            setChildrenToAddToAlliance([]);

        } catch (error: any) {
            console.error("Error adding children to alliance:", error);
            toast({ title: 'Erro ao Mover', description: error.message, variant: 'destructive' });
        } finally {
            setIsActionProcessing(null);
        }
    };
    
    const handleJoinRequest = async (invitationId: string, approve: boolean) => {
        if (!user) return;
        setIsActionProcessing(invitationId);
        try {
            if (approve) {
                await approveJoinRequest(invitationId, user.uid);
                toast({ title: "Membro Aprovado!", description: "O novo membro agora faz parte da aliança." });
            } else {
                await declineJoinRequest(invitationId, user.uid);
                toast({ title: "Pedido Recusado.", description: "O pedido de entrada foi recusado." });
            }
            fetchData(); // Refresh the list of members and requests
        } catch (error: any) {
            toast({ title: "Erro ao processar pedido", description: error.message, variant: 'destructive' });
        } finally {
            setIsActionProcessing(null);
        }
    };

    
    const moveTargetContexts = useMemo(() => {
        return availableContexts.filter(c => c.id !== allianceId);
    }, [availableContexts, allianceId]);


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
                <div className="flex flex-col sm:flex-row gap-2 items-start justify-between">
                    <div className="flex items-center gap-3">
                        <LinkIcon className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="text-3xl font-headline font-bold flex items-center gap-2">
                                {alliance.name}
                                {isOwner && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditNameOpen(true)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </h2>
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
                
                {isOwner && joinRequests.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos de Entrada Pendentes</CardTitle>
                            <CardDescription>Aprove ou recuse os pedidos para entrar nesta aliança.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {joinRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={req.inviteeAvatarUrl || ''} alt={req.inviterName} />
                                            <AvatarFallback>{getInitials(req.inviterName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{req.inviterName}</p>
                                            <p className="text-xs text-muted-foreground">{req.inviteeEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleJoinRequest(req.id, false)} disabled={isActionProcessing === req.id}>
                                            {isActionProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4"/>}
                                        </Button>
                                        <Button size="icon" className="h-8 w-8" onClick={() => handleJoinRequest(req.id, true)} disabled={isActionProcessing === req.id}>
                                             {isActionProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Mini Heróis na Aliança ({children.length})</CardTitle>
                        <CardDescription>
                            Estes são os heróis gerenciados por esta aliança. Use os controles para gerenciar o perfil de cada um.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {children.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {children.map(child => {
                                    const canManage = user?.uid === child.ownerId;
                                    return (
                                        <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <Avatar
                                                    className="h-10 w-10 text-lg ring-2 ring-offset-background ring-[var(--ring-color)] flex-shrink-0"
                                                    style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                                >
                                                    <AvatarImage src={child.avatar} alt={child.name} />
                                                    <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                                                        {getInitials(child.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <span className="font-semibold truncate block">{child.name}</span>
                                                    <p className="text-sm text-muted-foreground">Nível: {child.level}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <Link href={`/dashboard/mural?childId=${child.id}`}>
                                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                                      <Settings className="h-4 w-4" />
                                                  </Button>
                                              </Link>
                                              <Button variant="outline" size="sm" className="h-8" disabled={!canManage} onClick={() => { setChildToMove(child); setIsMoveDialogOpen(true); }}>
                                                    <Move className="h-4 w-4 mr-2" /> Mover
                                              </Button>
                                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" disabled={!canManage} onClick={() => setChildToRemove(child)}>
                                                <UserX className="h-4 w-4" />
                                              </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum Mini Herói nesta aliança ainda.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                         {soloChildren.length > 0 ? (
                            <Button onClick={() => setIsAddToAllianceDialogOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" /> Adicionar Herói à Aliança
                            </Button>
                        ) : (
                            <div className="text-center w-full">
                                <p className="text-sm text-muted-foreground mb-2">Você não tem heróis no seu espaço pessoal para adicionar.</p>
                                <Button asChild>
                                   <Link href="/dashboard/assistente">
                                     <UserPlus className="mr-2 h-4 w-4" /> Criar Novo Herói
                                   </Link>
                                </Button>
                            </div>
                        )}
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle>Membros da Aliança ({members.length})</CardTitle>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="link" size="sm" className="p-0 h-auto text-sm">O que são os papéis?</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                    <ScrollArea className="max-h-[60vh] p-4">
                                        <div className="space-y-4">
                                            <h4 className="font-medium leading-none">Papéis na Aliança</h4>
                                            <p className="text-sm text-muted-foreground">
                                              Em uma Aliança, existem diferentes papéis, cada um com permissões específicas para garantir que a colaboração seja organizada e segura.
                                            </p>
                                            <ul className="text-sm text-muted-foreground space-y-3">
                                              <li><strong>👑 Proprietário (Owner)</strong>: O fundador da Aliança. Tem controle total, podendo convidar/remover qualquer membro e gerenciar os papéis de todos.</li>
                                              <li><strong>🛡️ Co-Proprietário (Co-Owner)</strong>: O braço direito do proprietário. Pode gerenciar outros membros, exceto o proprietário e outros co-proprietários.</li>
                                              <li><strong>❤️ Guardião (Guardian)</strong>: O colaborador do dia a dia. Este é o papel padrão para novos membros e permite criar, editar e gerenciar missões e recompensas.</li>
                                              <li><strong>🧑‍🏫 Mentor</strong>: Um papel com acesso de "leitura". Ideal para um irmão mais velho ou parente que queira acompanhar e incentivar, mas sem poder de edição.</li>
                                              <li><strong>🧐 Especialista (Specialist)</strong>: Também um papel de "leitura", focado em análise. Perfeito para terapeutas ou psicopedagogos que precisam ver o progresso, mas sem fazer alterações.</li>
                                            </ul>
                                            <p className="text-sm text-muted-foreground pt-2">
                                                Essa estrutura permite que você convide diferentes pessoas para ajudar, cada uma com o nível de acesso apropriado para sua função no time de apoio do Mini Heroi.
                                            </p>
                                        </div>
                                    </ScrollArea>
                                    <div className="p-4 border-t">
                                        <PopoverClose asChild>
                                            <Button className="w-full">Entendi 👍</Button>
                                        </PopoverClose>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
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

                 {isOwner && (
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Zona de Perigo</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir Aliança
                            </Button>
                        </CardContent>
                    </Card>
                )}

            </div>
            
            <InviteMemberDialog
                isOpen={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                familyId={alliance.id}
                familyName={alliance.name}
                inviteCode={alliance.inviteCode}
                onInvitationSent={fetchData}
            />

            {childToRemove && (
                 <AlertDialog open={!!childToRemove} onOpenChange={() => setChildToRemove(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover {childToRemove.name} da Aliança?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá remover o herói do gerenciamento compartilhado desta aliança, retornando-o ao espaço pessoal de seu criador. Nenhum progresso será perdido.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isActionProcessing === childToRemove.id}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveFromAlliance} className="bg-destructive hover:bg-destructive/90" disabled={isActionProcessing === childToRemove.id}>
                                {isActionProcessing === childToRemove.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sim, Remover da Aliança
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {childToMove && (
                 <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mover {childToMove.name} para outro espaço</AlertDialogTitle>
                        <AlertDialogDescription>
                        Ao mover, todas as missões, recompensas, progresso e agenda escolar do Mini Heroi serão movidos juntos. Selecione o novo espaço que irá gerenciar este perfil.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setSelectedMoveContext} value={selectedMoveContext}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um destino..." />
                        </SelectTrigger>
                        <SelectContent>
                            {moveTargetContexts.map(context => (
                            <SelectItem key={context.id} value={context.id}>
                                {context.id === 'my-space' ? 'Meu Espaço (Cuidar Solo)' : `Aliança: ${context.name}`}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isActionProcessing === childToMove.id}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMoveHeroi} disabled={isActionProcessing === childToMove.id || !selectedMoveContext}>
                            {isActionProcessing === childToMove.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Movimentação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

             <AlertDialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Editar Nome da Aliança</AlertDialogTitle>
                        <AlertDialogDescription>Escolha um novo nome para sua aliança.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="alliance-name-input">Novo Nome</Label>
                        <Input
                            id="alliance-name-input"
                            value={newAllianceName}
                            onChange={(e) => setNewAllianceName(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSavingName}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateName} disabled={isSavingName || !newAllianceName.trim()}>
                            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Nome
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Aliança "{alliance.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é <strong>permanente e irreversível</strong>. Todos os membros serão removidos e os heróis desta aliança retornarão aos seus espaços "Cuidar Solo". Para confirmar, digite o nome exato da aliança abaixo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="delete-confirm-input" className="font-semibold">{alliance.name}</Label>
                        <Input
                            id="delete-confirm-input"
                            placeholder="Digite o nome da aliança para confirmar"
                            value={deleteConfirmationInput}
                            onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingAlliance}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAlliance}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeletingAlliance || deleteConfirmationInput !== alliance.name}
                        >
                            {isDeletingAlliance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Sim, Excluir Aliança
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isAddToAllianceDialogOpen} onOpenChange={setIsAddToAllianceDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Adicionar Heróis à Aliança</AlertDialogTitle>
                        <AlertDialogDescription>
                            Selecione os heróis do seu espaço "Cuidar Solo" que você deseja mover para esta aliança.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <ScrollArea className="max-h-[50vh] mt-2 pr-3">
                        <div className="space-y-3">
                            {soloChildren.map(child => (
                                <div
                                    key={child.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                >
                                    <Label htmlFor={`child-select-${child.id}`} className="flex items-center gap-3 cursor-pointer">
                                        <Avatar
                                            className="h-9 w-9 ring-2 ring-offset-background ring-[var(--ring-color)]"
                                            style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                        >
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{child.name}</span>
                                    </Label>
                                    <Checkbox
                                        id={`child-select-${child.id}`}
                                        checked={childrenToAddToAlliance.includes(child.id)}
                                        onCheckedChange={(checked) => {
                                            setChildrenToAddToAlliance(prev => 
                                                checked ? [...prev, child.id] : prev.filter(id => id !== child.id)
                                            );
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isActionProcessing === 'add-to-alliance'}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAddChildrenToAlliance} disabled={isActionProcessing === 'add-to-alliance' || childrenToAddToAlliance.length === 0}>
                            {isActionProcessing === 'add-to-alliance' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mover Selecionados
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
