
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
import { useState, useEffect } from "react";
import { updateChildProfile } from "@/lib/firebase/firestore";
import type { ChildProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome deve ter no máximo 50 caracteres." }),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
  gender: z.enum(['boy', 'girl', 'not-informed'], {
    required_error: "Por favor, selecione o gênero.",
  }),
  avatar: z.string().url({ message: "Por favor, insira uma URL válida para o avatar." }).optional().or(z.literal("")),
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
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      avatar: child.avatar || "",
    },
  });
  
  useEffect(() => {
    form.reset({
      name: child.name || "",
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      avatar: child.avatar || "",
    });
  }, [child, form]);

  const avatarUrl = form.watch("avatar");

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const updates: Partial<Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'accessCode' | 'stars' | 'xp' | 'level' | 'familyId' | 'updatedAt'>> = {
        name: data.name,
        birthDate: Timestamp.fromDate(data.birthDate),
        gender: data.gender,
        avatar: data.avatar,
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
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Nascimento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Gênero</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
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
        
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Avatar (Opcional)</FormLabel>
               <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 text-2xl">
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                    <AvatarFallback>MH</AvatarFallback>
                </Avatar>
                <FormControl className="flex-1">
                  <Input placeholder="https://example.com/avatar.png" {...field} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
