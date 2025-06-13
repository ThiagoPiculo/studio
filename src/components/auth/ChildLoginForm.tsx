
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
import { Loader2, KeyRound } from "lucide-react";
import { findChildByAccessCode } from "@/lib/firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const childLoginSchema = z.object({
  accessCode: z.string().length(6, { message: "O código de acesso deve ter 6 dígitos." }).regex(/^\d{6}$/, { message: "O código de acesso deve ser composto por 6 dígitos."}),
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
        setChildAuthenticatedState(childProfile);

        toast({ title: "Login Efetuado com Sucesso!", description: `Bem-vindo(a) de volta, ${childProfile.name}!` });
        router.push(`/dashboard/child/${childProfile.id}`);
      } else {
        throw new Error("Código de acesso inválido."); // More generic error here, specific message in catch
      }

    } catch (error: any) {
      console.error("Child login failed:", error);
      let description = "Não foi possível fazer login. Verifique o código e tente novamente.";
      if (error.message.includes("Código de acesso inválido")) {
        description = "Código de acesso inválido. Verifique se digitou os 6 números corretamente ou peça para um adulto conferir o código no painel de gerenciamento.";
      }
      toast({
        title: "Falha no Login",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Seu Código de Acesso Secreto</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456"
                  {...field}
                  className="h-14 text-2xl text-center tracking-[0.3em]"
                  maxLength={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-5 w-5" />
          )}
          Digitar Código
        </Button>
      </form>
    </Form>
  );
}
