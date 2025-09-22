

'use client';

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, UserX, Crown, Shield, LogOut, Heart, BookOpen, ClipboardList } from "lucide-react";
import { UserProfile, type FamilyRole, familyRoles } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { removeFamilyMember, updateFamilyMemberRole, leaveFamily, getFamilyById } from "@/lib/firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface MemberSettingsProps {
    member: UserProfile & { role: FamilyRole };
    isOwner: boolean; // Is the logged-in user the owner of the alliance?
    onMemberUpdate: () => void; // Callback to refresh data
}

export function MemberSettings({ member, isOwner, onMemberUpdate }: MemberSettingsProps) {
    const { toast } = useToast();
    const { currentContext, availableContexts } = useFamily();
    const { user } = useAuth();
    const router = useRouter();
    
    const [isPending, setIsPending] = useState(false);
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
    const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false);

    const isCurrentUserTheMember = member.uid === user?.uid;
    const canManageThisMember = isOwner && !isCurrentUserTheMember;

    const allianceId = currentContext;

    const handleRoleChange = async (newRole: string) => {
        if (!user || !allianceId || !canManageThisMember) return;
        setIsPending(true);
        try {
            await updateFamilyMemberRole(allianceId, member.uid, newRole as FamilyRole, user.uid);
            toast({
                title: "Papel Alterado!",
                description: `O papel de ${member.name} foi atualizado para ${familyRoles.find(r => r.id === newRole)?.label}.`
            });
            onMemberUpdate();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao alterar papel",
                description: error.message,
            });
        } finally {
            setIsPending(false);
        }
    };

    const handleRemoveClick = () => {
        setIsConfirmRemoveOpen(true);
    };
    
    const handleLeaveClick = () => {
        setIsConfirmLeaveOpen(true);
    };

    const handleRemoveConfirm = async () => {
        if (!user || !allianceId || !canManageThisMember) return;
        setIsPending(true);
        try {
            await removeFamilyMember(allianceId, member.uid, user.uid);
            toast({
                title: "Membro Removido",
                description: `${member.name} foi removido da aliança.`,
            });
            setIsConfirmRemoveOpen(false);
            onMemberUpdate();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao remover membro",
                description: error.message,
            });
        } finally {
            setIsPending(false);
        }
    };
    
    const handleLeaveConfirm = async () => {
        if (!user || !allianceId || isOwner) return;
        setIsPending(true);
        try {
            await leaveFamily(user.uid, allianceId);
            const allianceName = availableContexts.find(c => c.id === allianceId)?.name || 'da aliança';
            toast({
                title: "Você saiu da aliança",
                description: `Você não faz mais parte da aliança "${allianceName}".`,
            });
            setIsConfirmLeaveOpen(false);
            router.push('/dashboard/alliances');
            onMemberUpdate(); // Will trigger a re-fetch in the parent
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Erro ao sair da aliança",
                description: error.message,
            });
        } finally {
            setIsPending(false);
        }
    };
    
    const roleInfo = familyRoles.find(r => r.id === member.role);
    const Icon = roleInfo?.icon || Shield;

    return (
      <>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card gap-4">
            <div className="flex items-center gap-4 w-full">
                <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow min-w-0">
                    <p className="font-semibold">{member.name} {isCurrentUserTheMember && !isOwner && '(Você)'}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    {roleInfo && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-none">{roleInfo.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Badge variant={roleInfo?.id === 'Owner' ? "default" : "secondary"} className="text-sm">
                    <Icon className="mr-2 h-4 w-4" />
                    {roleInfo?.label || 'Membro'}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending || (!canManageThisMember && !isCurrentUserTheMember)}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações para {isCurrentUserTheMember ? 'você' : member.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canManageThisMember && (
                            <DropdownMenuRadioGroup value={member.role} onValueChange={handleRoleChange}>
                                {familyRoles.filter(r => r.id !== 'Owner').map(role => (
                                    <DropdownMenuRadioItem key={role.id} value={role.id} className="cursor-pointer">
                                        {role.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        )}
                        <DropdownMenuSeparator />
                        {isCurrentUserTheMember && !isOwner && (
                            <DropdownMenuItem onSelect={handleLeaveClick} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair da Aliança
                            </DropdownMenuItem>
                        )}
                        {canManageThisMember && (
                            <DropdownMenuItem onSelect={handleRemoveClick} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                <UserX className="mr-2 h-4 w-4" />
                                Remover da Aliança
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <AlertDialog open={isConfirmRemoveOpen} onOpenChange={setIsConfirmRemoveOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remover {member.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação removerá permanentemente {member.name} da aliança. Tem certeza?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                        Sim, Remover
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
         <AlertDialog open={isConfirmLeaveOpen} onOpenChange={setIsConfirmLeaveOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sair da Aliança?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Você tem certeza que deseja sair desta aliança? Você perderá o acesso aos heróis e precisará de um novo convite para retornar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                        Sim, Sair
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
}
