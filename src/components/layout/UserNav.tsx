
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { familyRoles } from "@/lib/types";
import { LogOut, UserCircle, Rocket, Settings, Link as LinkIcon, Shield } from "lucide-react";
import Link from "next/link";
import React from 'react';

export function UserNav() {
  const { user, logout, childProfile, isChildAuthenticated } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { role } = useUserRole();

  const handleLogout = async () => {
    await logout();
  };

  const displayName = isChildAuthenticated ? childProfile?.name : user?.name;
  const displayEmail = isChildAuthenticated ? `Código de Acesso: ${childProfile?.accessCode}` : user?.email;
  const avatarSrc = isChildAuthenticated ? childProfile?.avatar : user?.avatarUrl; 
  const avatarColor = isChildAuthenticated ? childProfile?.color : undefined;
  
  const currentAlliance = currentContext !== 'my-space' 
    ? availableContexts.find(c => c.id === currentContext)
    : null;
    
  const roleLabel = role ? familyRoles.find(r => r.id === role)?.label : null;

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (!user && !isChildAuthenticated) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 p-2 text-left h-auto group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center">
            <Avatar
              className="h-8 w-8 flex-shrink-0"
              style={avatarColor ? { '--ring-color': avatarColor } as React.CSSProperties : {}}
            >
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName || "User"} />}
              <AvatarFallback
                className="font-bold text-xs"
                style={avatarColor ? { backgroundColor: avatarColor } : {}}
              >
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="truncate group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium leading-tight">{displayName || (isChildAuthenticated ? "Heroi" : "Admin")}</p>
                {displayEmail && <p className="text-xs leading-tight text-muted-foreground">{displayEmail}</p>}
            </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          {currentAlliance && roleLabel ? (
            <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-3 w-3" />
                    <span>Aliança: <span className="font-medium text-foreground">{currentAlliance.name}</span></span>
                </div>
                 <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="h-3 w-3" />
                    <span>Papel: <span className="font-medium text-foreground">{roleLabel}</span></span>
                </div>
            </div>
          ) : (
             <div className="text-xs text-muted-foreground">
                <p>Você está no seu espaço pessoal.</p>
             </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {!isChildAuthenticated && user && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
           {isChildAuthenticated && childProfile && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/dashboard/child/${childProfile.id}/manage`}>
                <Rocket className="mr-2 h-4 w-4" />
                <span>Minha Página de Heroi</span>
              </Link>
            </DropdownMenuItem>
           )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
