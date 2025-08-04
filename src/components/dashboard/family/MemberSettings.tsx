import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Loader2, MoreHorizontal, UserX } from "lucide-react";
import { UserProfile, type FamilyRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { removeFamilyMember } from "@/lib/firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateFamilyMemberRole } from "@/lib/firebase/firestore";
import { useFamily } from "@/contexts/FamilyContext";
import { useMemo } from "react";

interface FamilyMemberRowProps {
    member: UserProfile;
}

export function MemberSettings({ member }: FamilyMemberRowProps) {
    const { toast } = useToast();
    const { currentContext, currentRole } = useFamily();
    const { user } = useAuth();
    const [isPending, setIsPending] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isEditingRole, setIsEditingRole] = useState(false);

    const canEdit = useMemo(() => {
        if (currentContext === 'my-space') return true;
        if (!currentRole) return false;
        const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
        return editableRoles.includes(currentRole as FamilyRole);
      }, [currentContext, currentRole]);

    const handleConfirm = async () => {
        setIsPending(true);
        try {
            if (!user?.uid) throw new Error("Usuário não autenticado.");
            await removeFamilyMember((member as any).familyId, member.uid, user.uid);
            toast({
                title: "Membro removido.",
                description: "O membro foi removido da família com sucesso.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: error.message || "Não foi possível remover o membro. Tente novamente.",
            });
        } finally {
            setIsPending(false);
            setIsConfirmOpen(false);
        }
    };
    
    const handleRoleChange = async (newRole: string) => {
        setIsEditingRole(true);
        try {
            if (!user?.uid) throw new Error("Usuário não autenticado.");
            await updateFamilyMemberRole((member as any).familyId, member.uid, newRole, user.uid);
            toast({
                title: "Papel alterado.",
                description: `O papel de ${member.name} foi alterado para ${newRole} com sucesso.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: error.message || "Não foi possível alterar o papel do membro. Tente novamente.",
            });
        } finally {
            setIsEditingRole(false);
        }
    };

    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

    return (
        
            
                
                    
                        {member.avatarUrl ? (
                            
                        ) : (
                            
                                {getInitials(member.name)}
                            
                        )}
                    
                    
                        
                            {member.name}
                        
                        
                            {member.email}
                        
                    
                
                
                    
                        
                            
                                Alterar Papel
                            
                            
                                Remover da Aliança
                            
                        
                    
                
            
        
        
            
                
                    Alterar o papel de {member.name}
                
                Selecione o novo papel para este membro da família.
                
                
                    
                        
                            
                                Selecione um papel
                            
                        
                        
                            
                                Proprietário
                            
                            
                                Co-Proprietário
                            
                            
                                Guardião
                            
                            
                                Convidado
                            
                        
                    
                
            
        
        
            
                Tem certeza absoluta?
                
                    Esta ação não pode ser desfeita. Isso removerá este usuário da sua Aliança.
                
            
            
                
                    Cancelar
                
                
                    {isPending ?
                        
                            
                        
                        :
                        
                            Remover da Aliança
                        
                    }
                
            
        
    );
}
