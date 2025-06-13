
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
import { useState, useEffect } from "react";
import { updateChildProfile } from "@/lib/firebase/firestore";
import type { ChildProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome deve ter no máximo 50 caracteres." }),
  age: z.coerce.number().min(0, { message: "A idade não pode ser negativa." }).max(18, { message: "A idade deve ser 18 ou menos." }),
  // avatar: z.string().url({ message: "Por favor, insira uma URL válida para o avatar." }).optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditChildProfileFormProps {
  child: ChildProfile;
  onProfileUpdate: (updatedProfile: Partial<ChildProfile>) => void;
}

export function EditChildProfileForm({ child, onProfileUpdate }: EditChildProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: child.name || "",
      age: child.age || 0,
      // avatar: child.avatar || "",
    },
  });
  
  useEffect(() => {
    form.reset({
      name: child.name || "",
      age: child.age || 0,
      // avatar: child.avatar || "",
    });
  }, [child, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const updates: Partial<Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'accessCode' | 'stars' | 'xp' | 'level' | 'familyId' | 'updatedAt'>> = {
        name: data.name,
        age: data.age,
        // avatar: data.avatar,
      };
      await updateChildProfile(child.id, updates);
      onProfileUpdate(updates); 
      toast({
        title: "Perfil Atualizado!",
        description: `As informações de ${data.name} foram salvas com sucesso.`,
      });
    } catch (error) {
      console.error("Error updating child profile:", error);
      toast({
        title: "Erro ao Atualizar",
        description: "Não foi possível salvar as alterações. Verifique os dados e tente novamente. Se o erro persistir, atualize a página.",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Criança</FormLabel>
              <FormControl>
                <Input placeholder="Nome do Mini Heroi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idade</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Idade" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 
        // Campo Avatar (a ser implementado futuramente se necessário)
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Avatar (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/avatar.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        */}
        <Button type="submit" className="w-full shadow-sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Alterações
        </Button>
      </form>
    </Form>
  );
}
