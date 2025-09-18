
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesByOwner, deleteChildProfile, moveChildToNewContext } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, PlusCircle, ArrowRight, Sparkles, Settings, Trash2, Move } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

function CuidandoSoloPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { availableContexts, setCurrentContext } = useFamily();
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [childToDelete, setChildToDelete] = useState<ChildProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const [childToMove, setChildToMove] = useState<ChildProfile | null>(null);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [selectedMoveContext, setSelectedMoveContext] = useState<string>('');
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchSoloChildren = async () => {
            setIsLoading(true);
            try {
                const soloChildren = await getChildProfilesByOwner(user.uid, true);
                setChildren(soloChildren.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching solo children:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSoloChildren();
    }, [user, authLoading]);
    
    const handleDeleteProfile = async () => {
        if (!childToDelete || !user) return;
        setIsDeleting(childToDelete.id);
        try {
            await deleteChildProfile(childToDelete.id, user);
            toast({ title: "Perfil de Herói Removido", description: `O perfil de ${childToDelete.name} foi excluído com sucesso.` });
            setChildren(prev => prev.filter(c => c.id !== childToDelete.id));
        } catch (error) {
            console.error("Error deleting child profile:", error);
            toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o perfil da criança.", variant: "destructive" });
        } finally {
            setIsDeleting(null);
            setChildToDelete(null);
        }
    };

    const handleOpenMoveDialog = (child: ChildProfile) => {
        setChildToMove(child);
        setSelectedMoveContext('');
        setIsMoveDialogOpen(true);
    };
    
    const handleMoveHeroi = async () => {
        if (!user || !childToMove || !selectedMoveContext) {
          toast({ title: 'Erro', description: 'Dados insuficientes para mover o heroi.', variant: 'destructive' });
          return;
        }
        setIsMoving(true);
        try {
          await moveChildToNewContext(childToMove.id, selectedMoveContext, user);
    
          toast({
            title: 'Herói Movido com Sucesso!',
            description: `${childToMove.name} agora pertence a uma nova aliança.`,
          });
          // Refresh the list of solo children
          setChildren(prev => prev.filter(c => c.id !== childToMove.id));
        } catch (error: any) {
          console.error("Error moving child profile:", error);
          toast({ title: 'Erro ao Mover', description: error.message, variant: 'destructive' });
        } finally {
          setIsMoving(false);
          setIsMoveDialogOpen(false);
          setChildToMove(null);
        }
      };
      
    const moveTargetContexts = useMemo(() => {
        return availableContexts.filter(c => c.id !== 'my-space');
    }, [availableContexts]);


    if (isLoading || authLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (children.length > 0) {
        return (
          <>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-6 w-6 text-primary"/>
                            Mini Herois em Cuidar Solo
                        </CardTitle>
                        <CardDescription>Estes são os heróis que você gerencia pessoalmente. Para colaborar com outros responsáveis, adicione o herói a uma aliança.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {children.map(child => (
                                <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <Avatar
                                            className="h-10 w-10 text-lg ring-2 ring-offset-background ring-[var(--ring-color)] flex-shrink-0"
                                            style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                        >
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={child.color ? { backgroundColor: child.color } : {}}>
                                                {getInitials(child.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <span className="font-semibold truncate block">{child.name}</span>
                                            <p className="text-sm text-muted-foreground">Nível: {child.level}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Link href={`/dashboard/mural?childId=${child.id}`}>
                                          <Button variant="outline" size="sm">
                                              Gerenciar <Settings className="ml-2 h-4 w-4" />
                                          </Button>
                                      </Link>
                                      {moveTargetContexts.length > 0 && (
                                        <Button variant="outline" size="sm" onClick={() => handleOpenMoveDialog(child)}>
                                            <Move className="h-4 w-4 mr-2" /> Mover
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-9 w-9" onClick={() => setChildToDelete(child)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            {childToDelete && (
                 <AlertDialog open={!!childToDelete} onOpenChange={() => setChildToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {childToDelete.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil e todos os dados associados (missões, recompensas, progresso, etc.).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={!!isDeleting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90" disabled={!!isDeleting}>
                                {isDeleting === childToDelete.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sim, Excluir Perfil
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {childToMove && (
                 <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mover {childToMove.name} para outro espaço</AlertDialogTitle>
                        <AlertDialogDescription>
                        Ao mover, todas as missões, recompensas, progresso e agenda escolar do Mini Heroi serão movidos juntos. Selecione o novo espaço que irá gerenciar este perfil.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setSelectedMoveContext} value={selectedMoveContext}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um destino..." />
                        </SelectTrigger>
                        <SelectContent>
                            {moveTargetContexts.map(context => (
                            <SelectItem key={context.id} value={context.id}>
                                {`Aliança: ${context.name}`}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMoving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMoveHeroi} disabled={isMoving || !selectedMoveContext}>
                        {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Movimentação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
           </>
        );
    }
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="shadow-lg bg-gradient-to-br from-card to-primary/5">
                <CardHeader className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-primary mb-2" />
                    <CardTitle className="text-3xl font-headline">Seu Co-piloto na Jornada Heroica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-lg text-muted-foreground">
                        Sabemos que a jornada de cuidar solo é cheia de superpoderes, mas também de muitos pratinhos para equilibrar. O Mini Herois foi pensado para ser seu parceiro, ajudando a organizar a rotina, a diminuir a carga mental do "o que temos que fazer agora?" e a criar um canal de comunicação divertido e visual com seus filhos. Deixe a gente cuidar da estrutura, para que você possa focar nas memórias.
                    </p>
                    <div className="text-center">
                         <Link href="/dashboard/novo-heroi">
                            <Button size="lg" className="bg-primary text-primary-foreground shadow-lg animate-pulse">
                                <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Primeiro Herói
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Transforme a Rotina em uma Aventura Divertida</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Cansada de repetir as mesmas coisas todos os dias? Transforme o 'escovar os dentes' ou 'fazer a lição' em missões heroicas! Com nosso sistema de gamificação, você usa a linguagem que as crianças amam (estrelas, níveis, recompensas) para motivá-las a cumprir suas responsabilidades de forma autônoma. É menos estresse para você, e mais diversão para eles.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CuidandoSoloPage() {
    return <CuidandoSoloPageContent />;
}
