
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, HelpCircle } from "lucide-react";
import { findChildByAccessCode } from "@/lib/firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const childLoginSchema = z.object({
  accessCode: z
    .string()
    .length(6, { message: "Hmm, seu Código de Acesso tem que ter 6 números. Conte direitinho e tente de novo, heroi!" })
    .regex(/^\d{6}$/, { message: "Opa! O Código de Acesso só usa números, como 1, 2, 3... Tente digitar só os números mágicos!" }),
});

type ChildLoginFormValues = z.infer<typeof childLoginSchema>;

export function ChildLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { setChildAuthenticatedState } = useAuth();

  const form = useForm<ChildLoginFormValues>({
    resolver: zodResolver(childLoginSchema),
    defaultValues: { accessCode: "" },
  });

  const onSubmit = async (values: ChildLoginFormValues) => {
    setIsLoading(true);
    try {
      const childProfile = await findChildByAccessCode(values.accessCode);
      if (childProfile) {
        sessionStorage.setItem('postLoginRefresh', 'true');
        setChildAuthenticatedState(childProfile);
        toast({ title: "Portal Desbloqueado!", description: `Bem-vindo(a) à aventura, ${childProfile.name}!` });
        router.push(`/dashboard/child/${childProfile.id}`);
      } else {
        toast({
          title: "Ops! Código Mágico Errado",
          description: "Essa chave não abriu o portal. Peça para um adulto conferir seu código ou tente digitar de novo com atenção!",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Child login failed:", error);
      toast({
        title: "Algo Deu Errado...",
        description: "Não consegui verificar seu código mágico. Tente de novo daqui a pouquinho ou chame um adulto se o problema continuar.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelpClick = () => {
    toast({
      title: "Precisa de Ajuda, Heroi?",
      description: "Seu Código de Acesso é um código de 6 números. Peça para um adulto te mostrar qual é o seu, para você poder entrar na aventura!",
      duration: 10000,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-center block mb-2">Digite seu Código de Acesso</FormLabel>
              <FormControl>
                <Input
                  placeholder="□ □ □ □ □ □"
                  {...field}
                  className="h-16 text-3xl text-center tracking-[0.3em] font-mono shadow-clay-inset bg-muted/30 border-2 border-primary/30 focus:border-primary focus:ring-primary text-primary rounded-xl"
                  maxLength={6}
                  autoComplete="off"
                  type="tel" 
                  inputMode="numeric" 
                  pattern="\d*" 
                />
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-14 text-xl rounded-xl shadow-clay hover:shadow-clay-hover active:shadow-clay-inset transition-all" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-6 w-6" />
          )}
          Entrar no Portal
        </Button>
        <Button type="button" variant="link" onClick={handleHelpClick} className="w-full">
          <HelpCircle className="mr-2 h-5 w-5" />
          Não sei meu código
        </Button>
      </form>
    </Form>
  );
}
