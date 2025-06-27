
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
import { LogOut, UserCircle, Rocket, Settings } from "lucide-react";
import Link from "next/link";
import React from 'react';

export function UserNav() {
  const { user, logout, childProfile, isChildAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const displayName = isChildAuthenticated ? childProfile?.name : user?.name;
  const displayEmail = isChildAuthenticated ? `Código de Acesso: ${childProfile?.accessCode}` : user?.email;
  const avatarSrc = isChildAuthenticated ? childProfile?.avatar : undefined; 
  const avatarColor = isChildAuthenticated ? childProfile?.color : undefined;

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
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar
            className="h-10 w-10 ring-2 ring-offset-2 ring-offset-background ring-[var(--ring-color)]"
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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName || (isChildAuthenticated ? "Herói" : "Admin")}</p>
            {displayEmail && <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>}
          </div>
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
              <Link href={`/dashboard/child/${childProfile.id}`}>
                <Rocket className="mr-2 h-4 w-4" />
                <span>Minha Página de Herói</span>
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
