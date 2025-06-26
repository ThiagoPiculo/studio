
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
  getPendingInvitationsForUser,
  acceptFamilyInvitation,
  declineFamilyInvitation,
  regenerateFamilyInviteCode,
  removeFamilyMember,
  getChildProfilesByFamily,
  getUnassignedChildProfilesByOwner,
  assignChildrenToFamily,
  removeChildFromFamily,
  updateFamilyName,
} from '@/lib/firebase/firestore';
import type { Family, UserProfile, FamilyInvitation, ChildProfile } from '@/lib/types';
import { Loader2, Users, UserPlus, Copy, LogOut, Trash2, Home, Link as LinkIcon, MailCheck, X, RefreshCw, MoreVertical, UserX, Sparkles, ArrowRight, PlusCircle, Edit3, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const searchParams = useSearchParams();
  
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
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isProcessingInvitationAction, setIsProcessingInvitationAction] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user || !isClient) return;

    if (currentContext === 'my-space') {
      setIsLoading(false);
      setFamilyDetails(null);
      setFamilyMembers([]);
      setChildrenInFamily([]);
      
      setIsLoadingInvitations(true);
      getPendingInvitationsForUser(user.uid)
        .then(invites => setInvitations(invites))
        .catch(error => {
          console.error("Error fetching invitations:", error);
          toast({ title: "Erro ao buscar convites", description: "Não foi possível carregar convites pendentes.", variant: "destructive" });
        })
        .finally(() => setIsLoadingInvitations(false));
        
    } else {
      setIsLoading(true);
      setInvitations([]);
      const fetchFamilyData = async () => {
        try {
          const [details, members, children] = await Promise.all([
            getFamilyById(currentContext),
            getFamilyMembers(currentContext),
            getChildProfilesByFamily(currentContext)
          ]);
          setFamilyDetails(details);
          setFamilyMembers(members);
          setChildrenInFamily(children);
        } catch (error) {
          console.error("Error fetching family data:", error);
          toast({ title: "Erro ao Carregar Família", description: "Não foi possível buscar os dados da família. Voltando para seu espaço pessoal.", variant: "destructive" });
          setCurrentContext('my-space');
        } finally {
          setIsLoading(false);
        }
      };
      fetchFamilyData();
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
      toast({ title: "Nome da Família Atualizado!", description: "O novo nome da sua aventura em família foi salvo." });
      
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
      toast({ title: "Nome da Família Inválido", description: "O nome deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const newFamily = await createFamily(user.uid, familyName.trim());
      const newContext = { id: newFamily.id, name: newFamily.name };
      setAvailableContexts([...availableContexts, newContext]);
      setCurrentContext(newFamily.id);
      toast({ title: "Sua Aventura em Família Começou!", description: `Bem-vindo à Família ${newFamily.name}!` });
      router.push('/dashboard/family');
    } catch (error) {
      console.error("Error creating family:", error);
      toast({ title: "Ops! Algo deu errado...", description: "Não foi possível criar a família. Tente novamente.", variant: "destructive" });
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
      const membership = await joinFamilyByInviteCode(user.uid, inviteCode.trim());
      if (membership) {
        const family = await getFamilyById(membership.familyId);
        if(family) {
            const newContext = { id: family.id, name: family.name };
            if(!availableContexts.find(c => c.id === newContext.id)){
              setAvailableContexts([...availableContexts, newContext]);
            }
            setCurrentContext(family.id);
            toast({ title: "Bem-vindo(a) à Equipe!", description: `Agora você faz parte da Família ${family.name}!` });
            router.push('/dashboard/family');
        }
      } else {
          toast({ title: "Código Inválido ou Inexistente", description: "Verifique o código e tente novamente.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error joining family:", error);
      toast({ title: "Ops! Algo deu errado...", description: "Não conseguimos te adicionar à família. Verifique o código e tente de novo.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

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
      console.error("Error sending invitation:", error);
      toast({ title: "Erro ao Convidar", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingEmailInvite(false);
    }
  };

  const handleAcceptInvitation = async (invitation: FamilyInvitation) => {
    if(!user) return;
    setIsProcessingInvitationAction(invitation.id);
    try {
      const family = await acceptFamilyInvitation(invitation.id, user.uid);
      const newContext = { id: family.id, name: family.name };
      if(!availableContexts.find(c => c.id === newContext.id)){
        setAvailableContexts([...availableContexts, newContext]);
      }
      setCurrentContext(family.id);
      toast({ title: "Bem-vindo(a) à Equipe!", description: `Você agora faz parte da aventura da Família ${family.name}!` });
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
      toast({ title: "Novo Código Secreto Gerado!", description: `O novo código de convite da família é ${newCode}.` });
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
        toast({ title: "Nova Jornada Solo", description: "Você saiu da família e sua aventura continua no seu espaço pessoal." });
      } else if (action === 'delete') {
        await deleteFamily(currentContext);
        toast({ title: "Aventura em Família Encerrada", description: "A família foi desfeita. Novas jornadas aguardam cada membro." });
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
        toast({ title: "Erro ao buscar Mini Herois", description: "Não foi possível carregar seus heróis disponíveis.", variant: "destructive" });
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
          toast({ title: "Nenhum Herói Selecionado", description: "Selecione pelo menos um Mini Herói para adicionar à família." });
          return;
      }
      
      setIsAssigningChildren(true);
      try {
          await assignChildrenToFamily(childrenIdsToAssign, currentContext);
          toast({ title: "Equipe Reforçada!", description: `${childrenIdsToAssign.length} ${childrenIdsToAssign.length === 1 ? 'Mini Herói foi adicionado' : 'Mini Herois foram adicionados'} à família!` });
          
          getChildProfilesByFamily(currentContext).then(setChildrenInFamily);

          setIsAddChildDialogOpen(false);
      } catch (error) {
          console.error("Error assigning children to family:", error);
          toast({ title: "Erro ao Adicionar", description: "Não foi possível adicionar os Mini Herois à família.", variant: "destructive" });
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
        toast({ title: "Herói em Missão Solo", description: `${childToRemove.name} agora está no espaço pessoal e não faz mais parte da família.` });
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

  if (!isClient || isLoading) {
    return <Loading />;
  }

  if (currentContext !== 'my-space' && familyDetails) {
    const isOwner = user?.uid === familyDetails.ownerId;
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Users className="h-8 w-8 text-primary mt-1" />
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
                    <CardTitle className="text-3xl font-headline">Família: {familyDetails.name}</CardTitle>
                    {isOwner && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsEditingName(true)}>
                        <Edit3 className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      </Button>
                    )}
                  </div>
                )}
                <CardDescription>Gerencie os membros e as configurações da sua família.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
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
          <Card>
            <CardHeader>
              <CardTitle>Convidar para a família</CardTitle>
              <CardDescription>Adicione outros responsáveis à sua família para gerenciarem os Mini Herois juntos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link">Por Link ou Código</TabsTrigger>
                  <TabsTrigger value="email">Por E-mail</TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Qualquer pessoa com este link ou código pode entrar na sua família como colaborador.
                  </p>
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
                </TabsContent>
                <TabsContent value="email" className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Envie um convite para um responsável com conta no Mini Herois se juntar à sua família.
                  </p>
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
                          Enviar Convite
                      </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary"/>Mini Herois da Família
                  </div>
                  <Button variant="outline" size="sm" onClick={handleOpenAddChildDialog}>
                    <Users className="mr-2 h-4 w-4" />
                    Adicionar Membro Infantil
                  </Button>
              </CardTitle>
              <CardDescription>Gerencie o perfil de cada Mini Herói da sua família.</CardDescription>
          </CardHeader>
          <CardContent>
              {childrenInFamily.length > 0 ? (
                  <div className="space-y-4">
                      {childrenInFamily.map(child => (
                          <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12 text-xl border-2 border-primary/50">
                                      <AvatarImage src={child.avatar} alt={child.name} />
                                      <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
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
                  <p className="text-muted-foreground text-center py-4">Ainda não há Mini Herois nesta família. Clique em "Adicionar" acima para começar.</p>
              )}
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
                  {isOwner ? "Excluir Família" : "Sair da Família"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isOwner 
                      ? "Esta ação não pode ser desfeita. Isso excluirá permanentemente a família, removerá todos os membros e desvinculará todas as crianças associadas." 
                      : "Você sairá desta família. Suas crianças deixarão de ser gerenciadas em conjunto com este grupo."}
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

        {memberToRemove && (
          <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover {memberToRemove.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover {memberToRemove.name} da família? Ele(a) perderá o acesso compartilhado às crianças. As crianças que ele(a) criou voltarão para o seu "Meu Espaço" pessoal.
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
              <AlertDialogTitle>Remover {childToRemove.name} da Família?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? {childToRemove.name} será movido(a) de volta para o "Meu Espaço" do responsável que o cadastrou e não será mais gerenciado por esta família. Esta ação não pode ser desfeita.
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
                    <DialogTitle>Adicionar Mini Heróis à Família</DialogTitle>
                    <DialogDescription>
                        Selecione os Mini Heróis do seu espaço pessoal que você deseja adicionar à família "{familyDetails?.name}".
                    </DialogDescription>
                </DialogHeader>
                {isLoadingUnassigned ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : unassignedChildren.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-muted-foreground mb-4">Todos os seus Mini Heróis já fazem parte de uma família.</p>
                        <Link href="/dashboard/onboarding">
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Cadastrar Novo Mini Herói
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
                                            <Avatar className="h-10 w-10 border-2 border-primary/50">
                                                <AvatarImage src={child.avatar} alt={child.name} />
                                                <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
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
          <CardTitle className="text-3xl font-headline flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Colaboração Familiar
          </CardTitle>
          <CardDescription>
            Crie uma família para gerenciar os Mini Herois em conjunto com outro pai, mãe ou responsável, ou junte-se a uma família já existente.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {isLoadingInvitations ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Carregando convites...</CardContent></Card>
      ) : invitations.length > 0 && (
        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <CardDescription>Você foi convidado para se juntar a estas famílias. Escolha uma para começar a colaborar!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                <div>
                  <p className="font-semibold">Família {invite.familyName}</p>
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

      <Tabs defaultValue={searchParams.get('action') || 'create'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create"><UserPlus className="mr-2 h-4 w-4" />Criar uma Família</TabsTrigger>
          <TabsTrigger value="join"><LinkIcon className="mr-2 h-4 w-4" />Entrar em uma Família</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Crie Sua Própria Família</CardTitle>
              <CardDescription>Dê um nome para sua família. Após criar, você receberá um código para convidar outros responsáveis.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateFamily}>
              <CardContent className="space-y-2">
                <Input 
                  placeholder="Ex: Família Aventura" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required 
                />
              </CardContent>
              <CardFooter>
                 <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Criar Família
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="join">
          <Card>
            <CardHeader>
              <CardTitle>Junte-se a uma Família Existente</CardTitle>
              <CardDescription>Peça o código de convite de 6 dígitos para o administrador da família e insira-o abaixo.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinFamily}>
              <CardContent className="space-y-2">
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
        </TabsContent>
      </Tabs>
       <Card className="bg-muted/50">
        <CardHeader className="flex-row items-center gap-3">
          <Home className="h-6 w-6 text-muted-foreground"/>
          <div>
            <CardTitle className="text-lg">O que é o "Meu Espaço"?</CardTitle>
            <CardDescription className="text-sm">
                Seu espaço é seu ambiente pessoal padrão. Você pode gerenciar seus Mini Herois aqui sem precisar de uma família. A funcionalidade de família é totalmente opcional.
            </CardDescription>
          </div>
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
