
"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  createFamily, 
  joinFamilyByInviteCode, 
  getFamilyById, 
  getFamilyMembers, 
  leaveFamily, 
  deleteFamily, 
  createFamilyInvitation,
  getPendingActionsForUser,
  acceptFamilyInvitation,
  declineFamilyInvitation,
  regenerateFamilyInviteCode,
  removeFamilyMember,
  getChildProfilesByFamily,
  getUnassignedChildProfilesByOwner,
  assignChildrenToFamily,
  removeChildFromFamily,
  updateFamilyName,
  getPendingJoinRequestsForFamily,
  approveJoinRequest,
  declineJoinRequest,
  resendJoinRequestNotification,
} from '@/lib/firebase/firestore';
import type { Family, UserProfile, FamilyInvitation, ChildProfile } from '@/lib/types';
import { Loader2, Users, UserPlus, Copy, LogOut, Trash2, Home, Link as LinkIcon, MailCheck, X, RefreshCw, MoreVertical, UserX, Sparkles, ArrowRight, PlusCircle, Edit3, Save, Shield, ChevronsUpDown, Check, HelpCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Loading from './loading';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

function FamilyPageContent() {
  const { user } = useAuth();
  const { currentContext, setCurrentContext, availableContexts, setAvailableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isClient, setIsClient] = useState(false);
  const [familyDetails, setFamilyDetails] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [childrenInFamily, setChildrenInFamily] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isProcessingEmailInvite, setIsProcessingEmailInvite] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FamilyInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isProcessingInvitationAction, setIsProcessingInvitationAction] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  
  const [joinRequests, setJoinRequests] = useState<FamilyInvitation[]>([]);
  const [isLoadingJoinRequests, setIsLoadingJoinRequests] = useState(false);
  const [isProcessingJoinRequest, setIsProcessingJoinRequest] = useState<string | null>(null);


  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [childToRemove, setChildToRemove] = useState<ChildProfile | null>(null);
  const [isRemovingChild, setIsRemovingChild] = useState(false);
  
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [unassignedChildren, setUnassignedChildren] = useState<ChildProfile[]>([]);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
  const [selectedChildrenToAdd, setSelectedChildrenToAdd] = useState<Record<string, boolean>>({});
  const [isAssigningChildren, setIsAssigningChildren] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (familyDetails) {
        setFamilyNameInput(familyDetails.name);
    }
  }, [familyDetails]);

  const fetchFamilyData = async (familyId: string) => {
    try {
      const [details, members, children, requests] = await Promise.all([
        getFamilyById(familyId),
        getFamilyMembers(familyId),
        getChildProfilesByFamily(familyId),
        user?.uid === (await getFamilyById(familyId))?.ownerId ? getPendingJoinRequestsForFamily(familyId) : Promise.resolve([]),
      ]);
      setFamilyDetails(details);
      setFamilyMembers(members);
      setChildrenInFamily(children);
      setJoinRequests(requests);
    } catch (error) {
      console.error("Error fetching family data:", error);
      toast({ title: "Erro ao Carregar Aliança", description: "Não foi possível buscar os dados da aliança. Voltando para seu espaço pessoal.", variant: "destructive" });
      setCurrentContext('my-space');
    } finally {
      setIsLoading(false);
      setIsLoadingJoinRequests(false);
    }
  };

  useEffect(() => {
    if (!user || !isClient) return;

    if (currentContext === 'my-space') {
      setIsLoading(false);
      setFamilyDetails(null);
      setFamilyMembers([]);
      setChildrenInFamily([]);
      setJoinRequests([]);
      
      setIsLoadingInvitations(true);
      getPendingActionsForUser(user.uid)
        .then(actions => {
          setInvitations(actions.filter(a => a.type === 'invite'));
          setPendingRequests(actions.filter(a => a.type === 'request'));
        })
        .catch(error => {
          console.error("Error fetching invitations:", error);
          toast({ title: "Erro ao buscar convites", variant: "destructive" });
        })
        .finally(() => setIsLoadingInvitations(false));
        
    } else {
      setIsLoading(true);
      setIsLoadingJoinRequests(true);
      setInvitations([]);
      setPendingRequests([]);
      fetchFamilyData(currentContext);
    }
  }, [currentContext, user, toast, setCurrentContext, isClient]);

  const handleUpdateFamilyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !familyDetails || !familyNameInput.trim() || familyNameInput.trim() === familyDetails.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdatingName(true);
    try {
      await updateFamilyName(familyDetails.id, user.uid, familyNameInput.trim());
      toast({ title: "Nome da Aliança Atualizado!", description: "O novo nome da sua aventura em equipe foi salvo." });
      
      setFamilyDetails(prev => prev ? { ...prev, name: familyNameInput.trim() } : null);
      setAvailableContexts(contexts => contexts.map(c => c.id === familyDetails.id ? { ...c, name: familyNameInput.trim() } : c));
      
      setIsEditingName(false);
    } catch (error: any) {
      toast({ title: "Erro ao Atualizar", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || familyName.trim().length < 3) {
      toast({ title: "Nome da Aliança Inválido", description: "O nome deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const newFamily = await createFamily(user.uid, familyName.trim());
      const newContext = { id: newFamily.id, name: newFamily.name };
      setAvailableContexts([...availableContexts, newContext]);
      setCurrentContext(newFamily.id);
      toast({ title: "Sua Aventura em Equipe Começou!", description: `Bem-vindo à Aliança ${newFamily.name}!` });
      router.push('/dashboard/family');
    } catch (error) {
      console.error("Error creating family:", error);
      toast({ title: "Ops! Algo deu errado...", description: "Não foi possível criar a aliança. Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || inviteCode.trim().length !== 6) {
      toast({ title: "Código de Convite Inválido", description: "O código deve ter exatamente 6 caracteres.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      await joinFamilyByInviteCode(user.uid, inviteCode.trim());
      // Re-fetch pending actions to update the UI state
      const actions = await getPendingActionsForUser(user.uid);
      setPendingRequests(actions.filter(a => a.type === 'request'));
      toast({ title: "Pedido Enviado!", description: "Um pedido para entrar na aliança foi enviado ao proprietário para aprovação." });
    } catch (error: any) {
      if (error.message === "APPROVAL_PENDING") {
        toast({ title: "Pedido Enviado!", description: "Um pedido para entrar na aliança foi enviado ao proprietário para aprovação." });
        // Re-fetch to update UI
        getPendingActionsForUser(user.uid).then(actions => setPendingRequests(actions.filter(a => a.type === 'request')));
      } else {
        console.error("Error joining family:", error);
        toast({ title: "Ops! Algo deu errado...", description: error.message || "Não conseguimos te adicionar à aliança. Verifique o código e tente de novo.", variant: "destructive" });
      }
    } finally {
      setInviteCode('');
      setIsProcessing(false);
    }
  };

  const handleResendNotification = async (requestId: string) => {
    setIsResending(true);
    try {
      await resendJoinRequestNotification(requestId);
      toast({ title: "Notificação Reenviada!", description: "O proprietário da aliança foi notificado novamente sobre o seu pedido." });
    } catch (error: any) {
       console.error("Error resending notification:", error);
       toast({ title: "Erro ao Reenviar", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || currentContext === 'my-space' || !inviteEmail.trim()) {
      toast({ title: "Dados inválidos", description: "Por favor, insira um e-mail válido para convidar.", variant: "destructive" });
      return;
    }
    setIsProcessingEmailInvite(true);
    try {
      await createFamilyInvitation(currentContext, user.uid, user.name || 'Um amigo', inviteEmail.trim());
      toast({ title: "Convite Enviado!", description: `Um convite para a aventura foi enviado para ${inviteEmail.trim()}.` });
      setInviteEmail('');
    } catch (error: any) {
      if (error.message === "Este usuário já é um membro da aliança.") {
        toast({
          title: "Membro já na equipe!",
          description: `O usuário com o e-mail ${inviteEmail.trim()} já faz parte desta aliança. Não é necessário enviar um novo convite.`,
          variant: "default",
        });
      } else if (error.message === "Nenhum usuário encontrado com este e-mail.") {
          toast({
              title: "Heroi Ainda Não Cadastrado",
              description: "O e-mail que você inseriu não pertence a um heroi cadastrado. Peça para a pessoa criar uma conta primeiro. Depois, você poderá adicioná-la à sua aliança!",
              variant: "default",
          });
      } else {
        console.error("Error sending invitation:", error);
        toast({ title: "Erro ao Convidar", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsProcessingEmailInvite(false);
    }
  };

  const handleAcceptInvitation = async (invitation: FamilyInvitation) => {
    if(!user) return;
    setIsProcessingInvitationAction(invitation.id);
    try {
      const family = await acceptFamilyInvitation(invitation.id, user.uid);
      const newContext = { id: family.id, name: `Aliança: ${family.name}` };
      if(!availableContexts.find(c => c.id === newContext.id)){
        setAvailableContexts([...availableContexts, newContext]);
      }
      setCurrentContext(family.id);
      toast({ title: "Bem-vindo(a) à Equipe!", description: `Você agora faz parte da aventura da Aliança ${family.name}!` });
      router.push('/dashboard/family');
    } catch (error: any) {
       console.error("Error accepting invitation:", error);
       toast({ title: "Erro ao Aceitar Convite", description: error.message, variant: "destructive" });
       setIsProcessingInvitationAction(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setIsProcessingInvitationAction(invitationId);
    try {
      await declineFamilyInvitation(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      toast({ title: "Convite Recusado", description: "Você escolheu não participar desta aventura por enquanto." });
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({ title: "Erro ao Recusar Convite", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingInvitationAction(null);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!user) return;
    setIsProcessingJoinRequest(requestId);
    try {
      await approveJoinRequest(requestId, user.uid);
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
      fetchFamilyData(currentContext); // Refresh family members
      toast({ title: "Membro Aprovado!", description: "O novo colaborador foi adicionado à sua aliança." });
    } catch (error: any) {
       console.error("Error approving request:", error);
       toast({ title: "Erro ao Aprovar", description: error.message, variant: "destructive" });
    } finally {
       setIsProcessingJoinRequest(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return;
    setIsProcessingJoinRequest(requestId);
    try {
      await declineJoinRequest(requestId, user.uid);
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
      toast({ title: "Pedido Recusado." });
    } catch (error: any) {
       console.error("Error declining request:", error);
       toast({ title: "Erro ao Recusar", description: error.message, variant: "destructive" });
    } finally {
       setIsProcessingJoinRequest(null);
    }
  };

  const handleCopyCode = () => {
    if (!familyDetails?.inviteCode) return;
    navigator.clipboard.writeText(familyDetails.inviteCode);
    toast({ title: "Código Copiado!", description: "Pronto para chamar reforços! O código de convite está na sua área de transferência." });
  };
  
  const handleCopyInviteLink = () => {
    if (!familyDetails?.inviteCode || !isClient) return;
    const inviteLink = `${window.location.origin}/auth/register?invite_code=${familyDetails.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Link de Convite Copiado!", description: "O link de aventura foi copiado. Compartilhe para aumentar a equipe!" });
  };
  
  const handleRegenerateCode = async () => {
    if (!user || !familyDetails) return;
    setIsRegeneratingCode(true);
    try {
      const newCode = await regenerateFamilyInviteCode(familyDetails.id, user.uid);
      setFamilyDetails(prev => prev ? { ...prev, inviteCode: newCode } : null);
      toast({ title: "Novo Código Secreto Gerado!", description: `O novo código de convite da aliança é ${newCode}.` });
    } catch (error: any) {
      console.error("Error regenerating code:", error);
      toast({ title: "Erro ao Regenerar Código", description: error.message, variant: "destructive" });
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!user || !familyDetails || !memberToRemove) return;
    setIsRemovingMember(true);
    try {
      await removeFamilyMember(familyDetails.id, memberToRemove.uid, user.uid);
      setFamilyMembers(prev => prev.filter(m => m.uid !== memberToRemove.uid));
      toast({ title: "Membro Iniciou Nova Jornada", description: `${memberToRemove.name} não faz mais parte da equipe e seguiu para uma aventura solo.` });
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({ title: "Erro ao Remover", description: error.message, variant: "destructive" });
    } finally {
      setIsRemovingMember(false);
      setMemberToRemove(null);
    }
  };
  
  const handleAction = async (action: 'leave' | 'delete') => {
    if (!user || currentContext === 'my-space') return;
    setIsProcessing(true);
    try {
      if (action === 'leave') {
        await leaveFamily(user.uid, currentContext);
        toast({ title: "Nova Jornada Solo", description: "Você saiu da aliança e sua aventura continua no seu espaço pessoal." });
      } else if (action === 'delete') {
        await deleteFamily(currentContext);
        toast({ title: "Aliança Encerrada", description: "A aliança foi desfeita. Novas jornadas aguardam cada membro." });
      }
      setAvailableContexts(availableContexts.filter(c => c.id !== currentContext));
      setCurrentContext('my-space');
      router.push('/dashboard');
    } catch (error) {
      console.error(`Error ${action === 'leave' ? 'leaving' : 'deleting'} family:`, error);
      toast({ title: `Erro ao ${action === 'leave' ? 'Sair' : 'Excluir'}`, description: "Não foi possível completar a ação. Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAddChildDialog = async () => {
    if (!user) return;
    setIsAddChildDialogOpen(true);
    setIsLoadingUnassigned(true);
    setSelectedChildrenToAdd({});
    try {
        const children = await getUnassignedChildProfilesByOwner(user.uid);
        setUnassignedChildren(children);
    } catch (error) {
        console.error("Error fetching unassigned children:", error);
        toast({ title: "Erro ao buscar Mini Herois", description: "Não foi possível carregar seus herois disponíveis.", variant: "destructive" });
    } finally {
        setIsLoadingUnassigned(false);
    }
  };

  const handleChildSelectionChange = (childId: string, isSelected: boolean) => {
    setSelectedChildrenToAdd(prev => ({ ...prev, [childId]: isSelected }));
  };

  const handleAssignChildrenToFamily = async () => {
      if (!user || currentContext === 'my-space') return;
      const childrenIdsToAssign = Object.entries(selectedChildrenToAdd)
        .filter(([, isSelected]) => isSelected)
        .map(([childId]) => childId);

      if (childrenIdsToAssign.length === 0) {
          toast({ title: "Nenhum Heroi Selecionado", description: "Selecione pelo menos um Mini Heroi para adicionar à aliança." });
          return;
      }
      
      setIsAssigningChildren(true);
      try {
          await assignChildrenToFamily(childrenIdsToAssign, currentContext);
          toast({ title: "Equipe Reforçada!", description: `${childrenIdsToAssign.length} ${childrenIdsToAssign.length === 1 ? 'Mini Heroi foi adicionado' : 'Mini Herois foram adicionados'} à aliança!` });
          
          getChildProfilesByFamily(currentContext).then(setChildrenInFamily);

          setIsAddChildDialogOpen(false);
      } catch (error) {
          console.error("Error assigning children to family:", error);
          toast({ title: "Erro ao Adicionar", description: "Não foi possível adicionar os Mini Herois à aliança.", variant: "destructive" });
      } finally {
          setIsAssigningChildren(false);
      }
  };

  const handleConfirmRemoveChild = async () => {
    if (!childToRemove) return;
    setIsRemovingChild(true);
    try {
        await removeChildFromFamily(childToRemove.id);
        setChildrenInFamily(prev => prev.filter(c => c.id !== childToRemove.id));
        toast({ title: "Heroi em Missão Solo", description: `${childToRemove.name} agora está no espaço pessoal e não faz mais parte da aliança.` });
    } catch (error: any) {
        console.error("Error removing child from family:", error);
        toast({ title: "Erro ao Remover", description: error.message, variant: "destructive" });
    } finally {
        setIsRemovingChild(false);
        setChildToRemove(null);
    }
  };

  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "P";

  const sortedMembers = useMemo(() => {
    if (!familyDetails) return familyMembers;
    return [...familyMembers].sort((a, b) => {
      if (a.uid === familyDetails.ownerId) return -1;
      if (b.uid === familyDetails.ownerId) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [familyMembers, familyDetails]);

  const userAlliances = useMemo(() => {
    return availableContexts.filter(c => c.id !== 'my-space');
  }, [availableContexts]);
  
  if (!isClient || isLoading) {
    return <Loading />;
  }

  if (currentContext !== 'my-space' && familyDetails) {
    const isOwner = user?.uid === familyDetails.ownerId;
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-grow">
                <Shield className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div className='flex-grow'>
                  {isOwner && isEditingName ? (
                    <form onSubmit={handleUpdateFamilyName} className="flex items-center gap-2">
                      <Input
                        value={familyNameInput}
                        onChange={(e) => setFamilyNameInput(e.target.value)}
                        className="h-auto text-3xl font-headline p-0 border-0 border-b-2 border-primary/50 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditingName(false); if(familyDetails) setFamilyNameInput(familyDetails.name); }}}
                      />
                      <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isUpdatingName || !familyNameInput.trim() || familyNameInput.trim() === familyDetails.name}>
                        {isUpdatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5" />}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setIsEditingName(false); if(familyDetails) setFamilyNameInput(familyDetails.name); }}>
                        <X className="h-5 w-5" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-3xl font-headline">Aliança: {familyDetails.name}</CardTitle>
                      {isOwner && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsEditingName(true)}>
                          <Edit3 className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                    </div>
                  )}
                  <CardDescription>Gerencie os membros e as configurações da sua aliança.</CardDescription>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setCurrentContext('my-space')} className="w-full sm:w-auto flex-shrink-0">
                <Home className="mr-2 h-4 w-4" />
                Mudar para Meu Espaço
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        {isOwner && (isLoadingJoinRequests ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Carregando pedidos...</CardContent></Card>
        ) : joinRequests.length > 0 && (
          <Card className="border-accent bg-accent/5">
            <CardHeader>
              <CardTitle>Pedidos para Entrar na Aliança</CardTitle>
              <CardDescription>Os usuários abaixo usaram o código de convite e aguardam sua aprovação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                  <div>
                    <p className="font-semibold">{req.inviterName}</p>
                    <p className="text-sm text-muted-foreground">{req.inviteeEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeclineRequest(req.id)}
                      disabled={isProcessingJoinRequest === req.id}
                    >
                      {isProcessingJoinRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="mr-1 h-4 w-4" />}
                      Recusar
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveRequest(req.id)}
                      disabled={isProcessingJoinRequest === req.id}
                    >
                      {isProcessingJoinRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="mr-1 h-4 w-4" />}
                      Aprovar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary"/>Mini Herois da Aliança
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenAddChildDialog}>
                      <Users className="mr-2 h-4 w-4" />
                      Adicionar Membro Infantil
                    </Button>
                </CardTitle>
                <CardDescription>Gerencie o perfil de cada Mini Heroi da sua aliança.</CardDescription>
            </CardHeader>
            <CardContent>
                {childrenInFamily.length > 0 ? (
                    <div className="space-y-4">
                        {childrenInFamily.map(child => (
                            <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                      className="h-12 w-12 text-xl ring-2 ring-offset-background ring-[var(--ring-color)]"
                                      style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                    >
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                                            {getInitials(child.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <span className="font-semibold">{child.name}</span>
                                      <p className="text-sm text-muted-foreground">Nível: {child.level} - {child.stars} Estrelas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link href={`/dashboard/child/${child.id}/manage`}>
                                      <Button variant="outline" size="sm">
                                          Gerenciar <ArrowRight className="ml-2 h-4 w-4" />
                                      </Button>
                                  </Link>
                                  {isOwner && (
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-9 w-9" onClick={() => setChildToRemove(child)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">Ainda não há Mini Herois nesta aliança. Clique em "Adicionar" acima para começar.</p>
                )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Membros Responsáveis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {sortedMembers.map(member => (
                <div key={member.uid} className="flex flex-col items-center gap-2 p-2 rounded-lg relative group">
                  <Avatar className="h-16 w-16 text-2xl border-2 border-primary">
                    <AvatarImage src={member.avatarUrl || `https://placehold.co/128x128.png?text=${getInitials(member.name)}`} alt={member.name || 'Membro'} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center">{member.name}</span>
                  {member.uid === familyDetails.ownerId ? (
                      <Badge variant="secondary" className="text-xs">Proprietário</Badge>
                  ) : (
                      <Badge variant="outline" className="text-xs">Colaborador</Badge>
                  )}
                  {isOwner && member.uid !== user?.uid && (
                    <div className="absolute top-0 right-0">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-20 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive" onClick={() => setMemberToRemove(member)}>
                                  <UserX className="mr-2 h-4 w-4" /> Remover Membro
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
             <CardHeader>
              <CardTitle>Adicionar Colaborador</CardTitle>
              <CardDescription>Adicione um usuário já cadastrado pelo e-mail para colaborar na gestão da aliança.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSendInvitation} className="space-y-4">
                      <Input
                          type="email"
                          placeholder="email.do.responsavel@exemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                          disabled={isProcessingEmailInvite}
                      />
                      <Button type="submit" disabled={isProcessingEmailInvite}>
                          {isProcessingEmailInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                          Adicionar por email de usuário cadastrado
                      </Button>
                  </form>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Ou
                      </span>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-muted-foreground'>Compartilhar Código de Convite</Label>
                    <div className="flex items-center gap-2">
                        <Input value={familyDetails.inviteCode} readOnly className="text-xl font-mono tracking-widest" />
                        <Button onClick={handleCopyCode} variant="outline" size="icon" aria-label="Copiar código">
                            <Copy className="h-5 w-5" />
                        </Button>
                        {isOwner && (
                        <Button onClick={handleRegenerateCode} variant="outline" size="icon" aria-label="Regenerar código" disabled={isRegeneratingCode}>
                            {isRegeneratingCode ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                        </Button>
                        )}
                    </div>
                    <Button onClick={handleCopyInviteLink} variant="link" className="p-0 h-auto text-sm mt-4">
                        <LinkIcon className="mr-2 h-4 w-4"/> Copiar link de convite direto
                    </Button>
                  </div>
            </CardContent>
          </Card>
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isProcessing}>
                    {isOwner ? <Trash2 className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
                    {isOwner ? "Excluir Aliança" : "Sair da Aliança"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isOwner 
                        ? "Esta ação não pode ser desfeita. Isso excluirá permanentemente a aliança, removerá todos os membros e desvinculará todas as crianças associadas." 
                        : "Você sairá desta aliança. Suas crianças deixarão de ser gerenciadas em conjunto com este grupo."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction(isOwner ? 'delete' : 'leave')} className="bg-destructive hover:bg-destructive/90">
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sim, {isOwner ? "Excluir" : "Sair"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-destructive/80 mt-2">
                  {isOwner ? "Esta é uma ação permanente e afetará todos os membros." : "Você pode se juntar novamente mais tarde com um novo código de convite."}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {memberToRemove && (
          <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover {memberToRemove.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover {memberToRemove.name} da aliança? Ele(a) perderá o acesso compartilhado às crianças. As crianças que ele(a) criou voltarão para o seu "Meu Espaço" pessoal.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isRemovingMember}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRemoveMember} className="bg-destructive hover:bg-destructive/90" disabled={isRemovingMember}>
                  {isRemovingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sim, Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {childToRemove && (
          <AlertDialog open={!!childToRemove} onOpenChange={() => setChildToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {childToRemove.name} da Aliança?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? {childToRemove.name} será movido(a) de volta para o "Meu Espaço" do responsável que o cadastrou e não será mais gerenciado por esta aliança. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemovingChild}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRemoveChild} className="bg-destructive hover:bg-destructive/90" disabled={isRemovingChild}>
                {isRemovingChild && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sim, Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
        )}
        
        <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Mini Herois à Aliança</DialogTitle>
                    <DialogDescription>
                        Selecione os Mini Herois do seu espaço pessoal que você deseja adicionar à aliança "{familyDetails?.name}".
                    </DialogDescription>
                </DialogHeader>
                {isLoadingUnassigned ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : unassignedChildren.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-muted-foreground mb-4">Todos os seus Mini Herois já fazem parte de uma aliança.</p>
                        <Link href="/dashboard/onboarding">
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Cadastrar Novo Mini Heroi
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="max-h-[40vh] my-4 pr-3">
                            <div className="space-y-3">
                                {unassignedChildren.map(child => (
                                    <div key={child.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20">
                                        <div className="flex items-center space-x-3">
                                            <Avatar
                                              className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)]"
                                              style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                            >
                                                <AvatarImage src={child.avatar} alt={child.name} />
                                                <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                                                    {getInitials(child.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Label htmlFor={`add-child-${child.id}`} className="font-medium cursor-pointer">
                                                {child.name}
                                            </Label>
                                        </div>
                                        <Checkbox
                                            id={`add-child-${child.id}`}
                                            checked={!!selectedChildrenToAdd[child.id]}
                                            onCheckedChange={(checked) => handleChildSelectionChange(child.id, !!checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsAddChildDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAssignChildrenToFamily} disabled={isAssigningChildren}>
                                {isAssigningChildren ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                Adicionar Selecionados
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View when user is in "My Space" (not in a family)
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-headline flex items-center">
                  <Shield className="mr-3 h-8 w-8 text-primary" />
                  Alianças de Herois
                </CardTitle>
                <CardDescription>
                  Crie uma aliança para gerenciar os Mini Herois em conjunto com outro pai, mãe ou responsável, ou junte-se a uma aliança já existente.
                </CardDescription>
              </div>
              {userAlliances.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="w-full sm:w-auto justify-between flex-shrink-0">
                    Mudar para uma aliança
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {userAlliances.map(alliance => (
                    <DropdownMenuItem key={alliance.id} onSelect={() => setCurrentContext(alliance.id)} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>{`Aliança: ${alliance.name}`}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      </Card>
      
      {isLoadingInvitations ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Carregando convites...</CardContent></Card>
      ) : invitations.length > 0 && (
        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <CardDescription>Você foi convidado para se juntar a estas alianças. Escolha uma para começar a colaborar!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                <div>
                  <p className="font-semibold">Aliança {invite.familyName}</p>
                  <p className="text-sm text-muted-foreground">Convidado por: {invite.inviterName}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeclineInvitation(invite.id)}
                    disabled={isProcessingInvitationAction === invite.id}
                  >
                    {isProcessingInvitationAction === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="mr-1 h-4 w-4" />}
                    Recusar
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAcceptInvitation(invite)}
                    disabled={isProcessingInvitationAction === invite.id}
                  >
                    {isProcessingInvitationAction === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MailCheck className="mr-1 h-4 w-4" />}
                    Aceitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
          <Card className="border-blue-500 bg-blue-500/5">
            <CardHeader>
              <CardTitle>Pedidos Enviados</CardTitle>
              <CardDescription>Suas solicitações para entrar nestas alianças estão aguardando aprovação dos proprietários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                  <div>
                    <p className="font-semibold">Aliança {req.familyName}</p>
                    <p className="text-sm text-muted-foreground">Pedido enviado para aprovação</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="secondary" size="sm">
                             <HelpCircle className="mr-2 h-4 w-4" /> O que fazer agora?
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Aguardando Aprovação do Heroi Mestre</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Enviamos um pedido para o proprietário da aliança. Para acelerar, você pode contatá-lo(a) diretamente e pedir para que verifique as notificações ou a seção "Aliança e Colaboradores" na conta dele(a) para aprovar sua entrada.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Entendi!</AlertDialogCancel>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="outline" onClick={() => handleResendNotification(req.id)} disabled={isResending}>
                        {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Reenviar Notificação
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Crie Sua Própria Aliança</CardTitle>
                <CardDescription>Dê um nome para sua aliança e convide outros responsáveis.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateFamily}>
              <CardContent>
                <Input 
                  placeholder="Ex: Aliança Aventura" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required 
                />
              </CardContent>
              <CardFooter>
                 <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Criar Aliança
                </Button>
              </CardFooter>
            </form>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" />Entrar em uma Aliança</CardTitle>
                <CardDescription>Insira um código de convite de 6 dígitos para se juntar.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinFamily}>
              <CardContent>
                  <Input 
                  placeholder="Código de 6 dígitos"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  maxLength={6}
                  required
                  className="font-mono tracking-widest"
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                  Entrar com Código
                </Button>
              </CardFooter>
            </form>
          </Card>
      </div>

       <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 flex-shrink-0" />
            <span>O que é o "Meu Espaço"?</span>
          </CardTitle>
          <CardDescription className="pt-2">
            Seu espaço é seu ambiente pessoal padrão. Você pode gerenciar seus Mini Herois aqui sem precisar de uma aliança. A funcionalidade de aliança é totalmente opcional.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function FamilyPage() {
    return (
        <Suspense fallback={<Loading />}>
            <FamilyPageContent />
        </Suspense>
    )
}
