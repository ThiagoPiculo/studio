
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { familyRoles } from "@/lib/types";
import { LogOut, UserCircle, Rocket, Settings, Link as LinkIcon, Shield } from "lucide-react";
import Link from "next/link";
import React from 'react';
import { Separator } from "../ui/separator";

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

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Avatar
            className="h-12 w-12 flex-shrink-0"
            style={avatarColor ? { '--ring-color': avatarColor } as React.CSSProperties : {}}
        >
            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName || "User"} />}
            <AvatarFallback
            className="font-bold"
            style={avatarColor ? { backgroundColor: avatarColor } : {}}
            >
            {getInitials(displayName)}
            </AvatarFallback>
        </Avatar>
        <div className="truncate">
            <p className="text-base font-semibold leading-tight">{displayName || (isChildAuthenticated ? "Heroi" : "Admin")}</p>
            {displayEmail && <p className="text-sm leading-tight text-muted-foreground">{displayEmail}</p>}
        </div>
      </div>
      
      <Separator/>

      <div className="text-sm">
        {currentAlliance && roleLabel ? (
            <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <span>Aliança: <span className="font-medium text-foreground">{currentAlliance.name}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Papel: <span className="font-medium text-foreground">{roleLabel}</span></span>
                </div>
            </div>
        ) : (
            <div className="text-sm text-muted-foreground">
                <p>Você está no seu espaço pessoal.</p>
            </div>
        )}
      </div>

      <Separator/>
      
      <nav className="flex flex-col gap-2 flex-grow">
          {!isChildAuthenticated && user && (
            <>
                <Link href="/dashboard/profile" passHref>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <UserCircle className="h-5 w-5" />
                        <span>Meu Perfil</span>
                    </Button>
                </Link>
                <Link href="/dashboard/settings" passHref>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <Settings className="h-5 w-5" />
                        <span>Configurações</span>
                    </Button>
                </Link>
            </>
          )}
          {isChildAuthenticated && childProfile && (
            <Link href={`/dashboard/mural?childId=${childProfile.id}`} passHref>
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Rocket className="h-5 w-5" />
                    <span>Minha Página de Heroi</span>
                </Button>
            </Link>
          )}
      </nav>
      
      <Button variant="destructive" onClick={handleLogoutClick} className="w-full mt-auto">
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}
