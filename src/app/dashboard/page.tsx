
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, CheckSquare, Smile, Brain, Sun, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChildProfile } from "@/lib/types";
import { getChildProfilesByOwner, getChildProfilesByFamily } from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!user) return;
      setIsLoadingChildren(true);
      try {
        let profiles: ChildProfile[];
        if (currentContext === 'my-space') {
          profiles = await getChildProfilesByOwner(user.uid);
        } else {
          profiles = await getChildProfilesByFamily(currentContext);
        }
        setChildren(profiles);
      } catch (error) {
        console.error("Error fetching children:", error);
        setChildren([]);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [user, currentContext]);
  
  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const calculateAge = (birthDate: Timestamp): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = birthDate.toDate();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        Carregando dados do usuário...
      </div>
    );
  }

  const currentContextData = availableContexts.find(c => c.id === currentContext);
  const contextName = currentContextData ? currentContextData.name : (currentContext === 'my-space' ? "Seu Espaço" : `Família: ${currentContext}`);


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Bem-vindo(a), {user.name || "Usuário Master"}!</CardTitle>
          <CardDescription>Visão geral dos seus Mini Herois em <span className="font-semibold text-primary">{contextName}</span>.</CardDescription>
        </CardHeader>
      </Card>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline">Seus Mini Herois</h2>
          <Link href="/dashboard/onboarding">
            <Button className="shadow-md"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Mini Heroi</Button>
          </Link>
        </div>
        {isLoadingChildren ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            Carregando Mini Herois...
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-10 shadow-md bg-gradient-to-br from-card to-secondary/10">
            <CardContent>
              <Smile className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum Mini Heroi Ainda!</h3>
              <p className="text-muted-foreground mb-6">Parece um pouco vazio por aqui. Comece adicionando sua primeira criança.</p>
              <Link href="/dashboard/onboarding">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-pulse">
                  <PlusCircle className="mr-2 h-5 w-5" /> Adicione Seu Primeiro Herói
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => {
              const age = calculateAge(child.birthDate);
              return (
              <Card key={child.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 via-card to-accent/5 p-4">
                  <CardTitle className="text-xl font-semibold">{child.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 p-4">
                  <div className="flex items-center justify-center mb-4">
                    <Avatar
                      className="h-24 w-24 text-4xl shadow-sm ring-2 ring-offset-2 ring-[var(--ring-color)] ring-offset-background"
                      style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                    >
                      <AvatarImage src={child.avatar} alt={child.name} />
                      <AvatarFallback
                        className="font-bold"
                        style={child.color ? { backgroundColor: child.color } : {}}
                      >
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mb-1">Idade: {age} Anos</p>
                  <p className="text-sm text-muted-foreground text-center mb-2">Nível: {child.level}</p>
                  <div className="text-center mb-3">
                    <span className="text-xl font-bold text-accent">{child.stars} Estrelas </span>
                    <Star className="inline h-5 w-5 fill-accent text-accent" />
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">XP: {child.xp}</p>
                  
                  <Link href={`/dashboard/child/${child.id}/manage`}>
                    <Button className="w-full mt-4 shadow-sm">Gerenciar {child.name}</Button>
                  </Link>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><CheckSquare className="text-primary"/> Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/missions/new"><Button variant="outline" className="w-full justify-start shadow-sm hover:bg-accent/10 hover:text-primary">Atribuir Nova Missão</Button></Link>
            <Link href="/dashboard/rewards/new"><Button variant="outline" className="w-full justify-start shadow-sm hover:bg-accent/10 hover:text-primary">Criar Recompensa</Button></Link>
            <Link href="/dashboard/family"><Button variant="outline" className="w-full justify-start shadow-sm hover:bg-accent/10 hover:text-primary">Gerenciar Família e Colaboradores</Button></Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
