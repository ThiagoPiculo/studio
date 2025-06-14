
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const onboardingSchema = z.object({
  childName: z.string().min(2, { message: "O nome da criança deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome da criança deve ter 50 caracteres ou menos." }),
  childAge: z.coerce.number().min(1, { message: "A idade deve ser pelo menos 1." }).max(18, { message: "A idade deve ser 18 ou menos." }),
  childGender: z.enum(['boy', 'girl', 'not-informed'], {
    required_error: "Por favor, selecione o gênero.",
  }),
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
      childAge: '' as unknown as number, 
      childGender: undefined,
    },
  });

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para adicionar uma criança. Por favor, faça login novamente.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await addChildProfile(user.uid, { name: values.childName, age: values.childAge, gender: values.childGender });
      toast({ title: "Mini Herois Adicionado!", description: `${values.childName} está pronto(a) para a aventura!` });
      router.push("/dashboard"); 
    } catch (error: any) {
      console.error("Failed to add child profile:", error);
      toast({
        title: "Falha ao Adicionar Mini Herois",
        description: "Não foi possível adicionar o Mini Herois. Verifique os dados informados ou tente novamente mais tarde.",
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
                <Input type="number" placeholder="Ex: 7" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="childGender"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Gênero do Mini Herois/Heroína</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-2 pt-1 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="boy" />
                    </FormControl>
                    <FormLabel className="font-normal">Menino</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="girl" />
                    </FormControl>
                    <FormLabel className="font-normal">Menina</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="not-informed" />
                    </FormControl>
                    <FormLabel className="font-normal">Prefiro não informar</FormLabel>
                  </FormItem>
                </RadioGroup>
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
          Adicionar Mini Herois
        </Button>
      </form>
    </Form>
  );
}
