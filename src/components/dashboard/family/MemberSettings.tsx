
'use client';

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, UserX, Crown, Shield } from "lucide-react";
import { UserProfile, type FamilyRole, familyRoles } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { removeFamilyMember, updateFamilyMemberRole } from "@/lib/firebase/firestore";
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
} from "@/components/ui/dropdown-menu";

interface MemberSettingsProps {
    member: UserProfile;
    isOwner: boolean;
}

export function MemberSettings({ member, isOwner }: MemberSettingsProps) {
    const { toast } = useToast();
    const { currentRole, currentContext } = useFamily();
    const { user } = useAuth();
    
    const [isPending, setIsPending] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const canManageRoles = useMemo(() => currentRole === 'Owner', [currentRole]);
    const canRemoveMember = useMemo(() => {
        if (!currentRole || isOwner) return false; // Cannot remove owner
        if (currentRole === 'Owner') return true; // Owner can remove anyone (except self)
        if (currentRole === 'Co-Owner' && (member.role !== 'Owner' && member.role !== 'Co-Owner')) return true; // Co-owner can remove lower roles
        return false;
    }, [currentRole, isOwner, member.role]);

    const handleRoleChange = async (newRole: string) => {
        if (!user || !allianceId) return;
        setIsPending(true);
        try {
            await updateFamilyMemberRole(allianceId, member.uid, newRole as FamilyRole, user.uid);
            toast({
                title: "Papel Alterado!",
                description: `O papel de ${member.name} foi atualizado para ${familyRoles.find(r => r.id === newRole)?.label}.`
            });
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
        setIsConfirmOpen(true);
    };

    const handleRemoveConfirm = async () => {
        if (!user || !allianceId) return;
        setIsPending(true);
        try {
            await removeFamilyMember(allianceId, member.uid, user.uid);
            toast({
                title: "Membro Removido",
                description: `${member.name} foi removido da aliança.`,
            });
            setIsConfirmOpen(false);
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
    
    const allianceId = currentContext;
    const roleInfo = familyRoles.find(r => r.id === member.role);

    return (
      <>
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name || ''} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{member.name} {member.uid === user?.uid && '(Você)'}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Badge variant={isOwner ? "default" : "secondary"} className="text-sm">
                    {isOwner ? <Crown className="mr-2 h-4 w-4" /> : <Shield className="mr-2 h-4 w-4" />}
                    {roleInfo?.label || 'Membro'}
                </Badge>
                {canManageRoles && member.uid !== user?.uid && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações para {member.name}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={member.role} onValueChange={handleRoleChange}>
                                {familyRoles.filter(r => r.id !== 'Owner').map(role => (
                                    <DropdownMenuRadioItem key={role.id} value={role.id}>
                                        {role.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                             {canRemoveMember && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={handleRemoveClick} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                        <UserX className="mr-2 h-4 w-4" />
                                        Remover da Aliança
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remover {member.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação removerá permanentemente {member.name} da aliança. Eles perderão o acesso aos Mini Herois deste espaço. Tem certeza?
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
      </>
    );
}

