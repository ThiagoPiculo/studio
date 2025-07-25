
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getFamilyMembers, getChildProfilesByFamily } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Shield, Link as LinkIcon } from 'lucide-react';
import Loading from './loading';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type AllianceDetails = {
  id: string;
  name: string;
  role: FamilyRole | 'Personal' | null;
  members: UserProfile[];
  children: ChildProfile[];
};

export default function AlliancesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { availableContexts, setCurrentContext } = useFamily();
  const [alliancesDetails, setAlliancesDetails] = useState<AllianceDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const userAlliances = availableContexts.filter(c => c.id !== 'my-space');

      if (userAlliances.length === 0) {
        // Se não houver alianças, redireciona para a página principal de família para criar/entrar
        router.replace('/dashboard/family');
        return;
      }
      
      const detailsPromises = userAlliances.map(async (allianceContext) => {
        const [members, children] = await Promise.all([
          getFamilyMembers(allianceContext.id),
          getChildProfilesByFamily(allianceContext.id)
        ]);
        return {
          id: allianceContext.id,
          name: allianceContext.name,
          role: allianceContext.role || null,
          members,
          children
        };
      });

      const details = await Promise.all(detailsPromises);
      setAlliancesDetails(details);
      setIsLoading(false);
    };

    if (availableContexts.length > 0) {
      fetchDetails();
    }
  }, [availableContexts, router]);

  const handleNavigateToAlliance = (contextId: string) => {
    setCurrentContext(contextId);
    router.push('/dashboard/family');
  };

  const handleInviteToAlliance = (contextId: string) => {
    setCurrentContext(contextId);
    router.push('/dashboard/family?action=invite');
  };

  const getRoleIcon = (role: FamilyRole | 'Personal' | null) => {
    const roleInfo = familyRoles.find(r => r.id === role);
    return roleInfo ? <span title={roleInfo.label}>{roleInfo.label}</span> : <Shield className="h-4 w-4" />;
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Minhas Alianças
          </CardTitle>
          <CardDescription>
            Gerencie todas as equipes de herois que você faz parte.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        {alliancesDetails.map(alliance => (
          <Card key={alliance.id} className="flex flex-col">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-chart-4" />
                      {alliance.name}
                    </CardTitle>
                    <CardDescription>Seu papel: {getRoleIcon(alliance.role)}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colaboradores</h4>
                    <div className="flex -space-x-2">
                      {alliance.members.map(member => (
                        <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatarUrl} alt={member.name || ''} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                </div>
                <Separator />
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Mini Herois</h4>
                    <div className="flex -space-x-2">
                      {alliance.children.map(child => (
                        <Avatar key={child.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={child.avatar} alt={child.name} />
                            <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {alliance.children.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum herói nesta aliança ainda.</p>}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleInviteToAlliance(alliance.id)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Convidar
                </Button>
                <Button onClick={() => handleNavigateToAlliance(alliance.id)}>
                    Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
