
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
import { useAuth } from "@/contexts/AuthContext";
import { addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const onboardingSchema = z.object({
  childName: z.string().min(2, { message: "O nome da criança deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome da criança deve ter 50 caracteres ou menos." }),
  childAge: z.coerce.number().min(1, { message: "A idade deve ser pelo menos 1." }).max(18, { message: "A idade deve ser 18 ou menos." }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      childName: "",
      childAge: undefined,
    },
  });

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para adicionar uma criança.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await addChildProfile(user.uid, { name: values.childName, age: values.childAge });
      toast({ title: "Mini Heroi Adicionado!", description: `${values.childName} está pronto(a) para a aventura!` });
      router.push("/dashboard"); 
    } catch (error: any) {
      console.error("Failed to add child profile:", error);
      toast({
        title: "Falha ao Adicionar Mini Heroi",
        description: error.message || "Ocorreu um erro inesperado. Por favor, tente novamente.",
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
          name="childName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Criança</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Alex" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="childAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idade da Criança</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 7" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Adicionar Mini Heroi
        </Button>
      </form>
    </Form>
  );
}
