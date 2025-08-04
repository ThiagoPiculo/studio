
import { getFamilyMembers, getChildProfilesByFamily, getFamilyMemberships } from '@/lib/firebase/firestore';
import type { UserProfile, ChildProfile, FamilyRole, FamilyMembership } from '@/lib/types';
import { familyRoles } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Shield, Link as LinkIcon, Info } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase/config';
import { redirect } from 'next/navigation';
import { FamilySwitcherClient } from './FamilySwitcherClient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

type AllianceDetails = {
  id: string;
  name: string;
  role: FamilyRole | 'Personal' | null;
  members: UserProfile[];
  children: ChildProfile[];
};

async function getAlliancesDetails(userId: string): Promise<AllianceDetails[]> {
    const membershipsQuery = query(collection(db, 'familyMemberships'), where('userId', '==', userId));
    const membershipsSnapshot = await getDocs(membershipsQuery);
    const memberships = membershipsSnapshot.docs.map(doc => doc.data() as FamilyMembership);

    const allianceContexts = await Promise.all(memberships.map(async (membership) => {
        const familyDoc = await getDoc(doc(db, 'families', membership.familyId));
        if (familyDoc.exists()) {
            return {
                id: membership.familyId,
                name: familyDoc.data().name,
                role: membership.role,
            };
        }
        return null;
    }));

    const validAllianceContexts = allianceContexts.filter(Boolean) as { id: string; name: string; role: FamilyRole }[];
    
    if (validAllianceContexts.length === 0) {
        return [];
    }
    
    const detailsPromises = validAllianceContexts.map(async (allianceContext) => {
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

    return Promise.all(detailsPromises);
}


export default async function AlliancesPage() {
  const user = auth.currentUser;
  
  if (!user) {
    // This should be handled by middleware, but as a safeguard:
    redirect('/auth/login');
  }

  const alliancesDetails = await getAlliancesDetails(user.uid);
  
  if (alliancesDetails.length === 0) {
    // If user has no alliances, redirect them to the main family page to create/join one.
    redirect('/dashboard/family');
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
        {alliancesDetails.map(alliance => {
          const roleInfo = familyRoles.find(r => r.id === alliance.role);
          return (
            <Card key={alliance.id} className="flex flex-col">
              <CardHeader className="flex-grow">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-chart-4" />
                    {alliance.name}
                  </CardTitle>
                  {roleInfo ? (
                      <div className="text-sm text-muted-foreground flex flex-col gap-2 pt-2">
                        <span className="font-semibold text-foreground">Seu papel: {roleInfo.label}</span>
                        <div className="text-xs text-muted-foreground flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{roleInfo.description}</span>
                        </div>
                      </div>
                  ) : (
                     <CardDescription>Seu papel não foi definido.</CardDescription>
                  )}
              </CardHeader>
              <CardContent className="space-y-4">
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
              <CardFooter className="grid grid-cols-2 gap-2 mt-auto">
                 <FamilySwitcherClient contextId={alliance.id} action="invite" />
                 <FamilySwitcherClient contextId={alliance.id} action="details" />
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
