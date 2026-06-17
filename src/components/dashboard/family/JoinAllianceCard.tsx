
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { joinFamilyByInviteCode } from "@/lib/supabase/db";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function JoinAllianceCard() {
    const [inviteCode, setInviteCode] = useState("");
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Você precisa estar logado.", variant: "destructive" });
            return;
        }
        if (!inviteCode.trim()) {
            toast({ title: "Código de Convite Inválido", description: "Por favor, insira um código.", variant: "destructive" });
            return;
        }
        setIsPending(true);
        try {
            await joinFamilyByInviteCode(user.uid, inviteCode);
            toast({
                title: "Você entrou na Aliança!",
                description: "Agora vocês podem colaborar para gerenciar as missões e recompensas.",
            });
            router.push('/dashboard/alliances'); // Redirect to see the new alliance
        } catch (error: any) {
             if (error.message === 'APPROVAL_PENDING') {
              toast({ 
                  title: "Pedido Enviado!", 
                  description: "Um pedido para entrar na aliança foi enviado ao proprietário para aprovação.",
                  duration: 8000
                });
              router.push('/dashboard/heroes');
            } else {
              toast({
                  variant: "destructive",
                  title: "Erro ao Entrar na Aliança",
                  description: error.message || "Não foi possível entrar na aliança. Verifique o código e tente novamente.",
              });
            }
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Entrar em uma Aliança</CardTitle>
                <CardDescription>
                    Se você recebeu um código de convite, insira-o abaixo para se juntar a uma equipe.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Código de Convite"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={isPending}
                    />
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UserPlus className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
