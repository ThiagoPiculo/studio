import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Edit3, HelpCircle, Repeat, Star as StarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/lib/types";
import { EditAvatarDialog } from "./EditAvatarDialog";
import { RemoveFamilyMemberDialog } from "./RemoveFamilyMemberDialog";
import { MemberRoleSelect } from "./MemberRoleSelect";
import { RequestOwnershipDialog } from "./RequestOwnershipDialog";

interface MemberSettingsProps {
    member: UserProfile
    isOwner: boolean
}
export function MemberSettings({ member, isOwner }: MemberSettingsProps) {
    const { toast } = useToast();
    const { canEdit, isLoading: isRoleLoading } = useUserRole();
    const [editAvatarOpen, setEditAvatarOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    
    return (
        
            
                
                    
                        
                            
                                
                            
                            
                                
                            
                        
                        
                            
                                {member.name}
                            
                            
                                {member.email}
                            
                        
                    
                    
                    
                        
                    
                
                
                    
                    
                        
                            MemberRoleSelect member={member}/>
                            
                                Enviar pedido
                            
                            
                                RemoveFamilyMemberDialog member={member} isConfirmOpen={isConfirmOpen} setIsConfirmOpen={setIsConfirmOpen}/>
                            
                        
                    
                    
                        
                            Requisitar Propriedade
                        
                        
                            
                            
                            
                            
                            
                        
                    
                
            
    );
}
