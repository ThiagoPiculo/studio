
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { familyRoles } from "@/lib/types";
import { LogOut, UserCircle, Rocket, Settings, Link as LinkIcon, Shield, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import React from 'react';
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { user, logout, childProfile, isChildAuthenticated } = useAuth();
  const { currentContext, availableContexts, currentRole } = useFamily();

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  const displayName = isChildAuthenticated ? childProfile?.name : user?.name;
  const displayEmail = isChildAuthenticated ? `Código de Acesso: ${childProfile?.accessCode}` : user?.email;
  const avatarSrc = isChildAuthenticated ? childProfile?.avatar : user?.avatarUrl;
  const avatarColor = isChildAuthenticated ? childProfile?.color : undefined;
  
  const currentAlliance = currentContext !== 'my-space' 
    ? availableContexts.find(c => c.id === currentContext)
    : null;
    
  const roleLabel = currentRole ? familyRoles.find(r => r.id === currentRole)?.label : null;

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (!user && !isChildAuthenticated) {
    return null;
  }
  
  if (isChildAuthenticated) {
    return (
        <div className="flex flex-col h-full p-2 space-y-2">
            <Link href={`/dashboard/mural?childId=${childProfile?.id}`} passHref>
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Rocket className="h-5 w-5" />
                    <span>Minha Página de Heroi</span>
                </Button>
            </Link>
             <Button variant="destructive" onClick={handleLogoutClick} className="w-full mt-auto">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </div>
    )
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full h-auto justify-between p-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
                <div className="flex items-center gap-2 truncate">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarSrc || ''} alt={displayName || 'User'} />
                        <AvatarFallback style={avatarColor ? {backgroundColor: avatarColor} : {}}>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate text-left group-data-[collapsible=icon]:hidden">
                        <p className="font-semibold text-sm truncate">{displayName}</p>
                    </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] mb-2" side="top" align="start">
             <div className="flex flex-col h-full p-2 space-y-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarSrc || ''} alt={displayName || 'User'} />
                        <AvatarFallback style={avatarColor ? {backgroundColor: avatarColor} : {}}>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                        <p className="text-sm font-semibold leading-tight">{displayName}</p>
                        <p className="text-xs leading-tight text-muted-foreground">{displayEmail}</p>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <div className="text-xs text-muted-foreground">
                    {currentAlliance && roleLabel ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <LinkIcon className="h-3 w-3" />
                                <span>Aliança: <span className="font-medium text-foreground">{currentAlliance.name}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                <span>Papel: <span className="font-medium text-foreground">{roleLabel}</span></span>
                            </div>
                        </div>
                    ) : (
                        <p>Você está no seu espaço pessoal.</p>
                    )}
                </div>
                 <DropdownMenuSeparator />
                <nav className="flex flex-col gap-1">
                     <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile">
                            <UserCircle className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                         <Link href="/dashboard/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                        </Link>
                    </DropdownMenuItem>
                </nav>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Button variant="destructive" size="sm" onClick={handleLogoutClick} className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                 </DropdownMenuItem>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
