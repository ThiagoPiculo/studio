
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
import { getChildProfilesByFamily, getChildProfilesByOwner, updateChildProfile, getUserProfile } from "@/lib/firebase/firestore";
import type { ChildProfile, HeroColor, UserProfile, SchoolShift } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Calendar as CalendarIcon, Trash2, RotateCcw, AlertTriangle, User, Clock, School } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse, isValid, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { heroColors } from "@/lib/hero-colors";
import { ColorSelector } from "./ColorSelector";
import { Skeleton } from "../ui/skeleton";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { schoolShifts } from "@/lib/types";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome deve ter no máximo 50 caracteres." }),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
  gender: z.enum(['boy', 'girl', 'not-informed'], {
    required_error: "Por favor, selecione o gênero.",
  }),
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable'], {
    required_error: "Por favor, selecione o turno escolar.",
  }),
  color: z.string().refine((val) => heroColors.includes(val as HeroColor), {
    message: "Por favor, selecione uma cor válida."
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditChildProfileFormProps {
  child: ChildProfile;
  onProfileUpdate: () => void;
  onDeleteProfile: () => void;
  isDeleting: boolean;
  onResetProgress: () => void;
  isResetting: boolean;
}

export function EditChildProfileForm({ child, onProfileUpdate, onDeleteProfile, isDeleting, onResetProgress, isResetting }: EditChildProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateInput, setDateInput] = useState<string>("");
  const [month, setMonth] = useState<Date>(child.birthDate?.toDate() || new Date());
  
  const [usedColors, setUsedColors] = useState<HeroColor[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: child.name || "",
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      schoolShift: child.schoolShift || 'not_applicable',
      color: child.color || heroColors[0], 
    },
  });
  
  useEffect(() => {
    form.reset({
      name: child.name || "",
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      schoolShift: child.schoolShift || 'not_applicable',
      color: child.color || heroColors[0],
    });
    if (child.birthDate) {
      setMonth(child.birthDate.toDate());
    }
  }, [child, form]);

  useEffect(() => {
    const fetchAuxiliaryData = async () => {
        if (!child) {
            setIsLoadingColors(false);
            setIsLoadingOwner(false);
            return;
        };
        
        setIsLoadingColors(true);
        setIsLoadingOwner(true);

        try {
            // Fetch used colors
            let otherChildren: ChildProfile[] = [];
            if (child.familyId) {
                otherChildren = await getChildProfilesByFamily(child.familyId);
            } else {
                otherChildren = await getChildProfilesByOwner(child.ownerId);
            }
            const colors = otherChildren
                .filter(c => c.id !== child.id) 
                .map(c => c.color);
            setUsedColors(colors as HeroColor[]);
        } catch(error) {
            console.error("Error fetching used colors:", error);
        } finally {
            setIsLoadingColors(false);
        }

        try {
            // Fetch owner profile
            const ownerProfile = await getUserProfile(child.ownerId);
            setOwner(ownerProfile);
        } catch(error) {
            console.error("Error fetching owner profile:", error);
        } finally {
            setIsLoadingOwner(false);
        }
    };
    fetchAuxiliaryData();
  }, [child]);


  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    
    try {
      const updates: Partial<ChildProfile> = {
        name: data.name,
        birthDate: Timestamp.fromDate(data.birthDate),
        gender: data.gender,
        schoolShift: data.schoolShift,
        color: data.color,
      };
      await updateChildProfile(child.id, updates);
      onProfileUpdate();
    } catch (error) {
      console.error("Error updating child profile:", error);
      toast({
        title: "Erro ao Atualizar",
        description: "Não foi possível salvar as alterações. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (birthDate: Date | undefined): number | null => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), birthDate);
  };

  const handleDateMask = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 8) {
      digits = digits.slice(0, 8);
    }
    if (digits.length > 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const watchedBirthDate = form.watch("birthDate");
  const calculatedAge = calculateAge(watchedBirthDate);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  <div className="flex items-center gap-4">
                      <Popover open={isCalendarOpen} onOpenChange={(open) => {
                      if (open) {
                          setDateInput(field.value ? format(field.value, 'dd/MM/yyyy') : "");
                      }
                      setIsCalendarOpen(open);
                      }}>
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
                          <div className="p-2 border-b">
                          <Input
                              placeholder="Digite: dd/mm/aaaa"
                              value={dateInput}
                              onChange={(e) => {
                                  const maskedValue = handleDateMask(e.target.value);
                                  setDateInput(maskedValue);
                                  if (maskedValue.length === 10) {
                                  const parsedDate = parse(maskedValue, 'dd/MM/yyyy', new Date());
                                  if (isValid(parsedDate)) {
                                      field.onChange(parsedDate);
                                      setMonth(parsedDate);
                                  }
                                  }
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const date = parse(dateInput, 'dd/MM/yyyy', new Date());
                                  if (isValid(date) && date.getFullYear() > 1900 && date < new Date()) {
                                      field.onChange(date);
                                      setMonth(date);
                                      setIsCalendarOpen(false);
                                  } else {
                                      toast({ title: "Data Inválida", description: "Use o formato dd/mm/aaaa e uma data válida.", variant: "destructive" });
                                  }
                                  }
                              }}
                              />
                          </div>
                          <Calendar
                          locale={ptBR}
                          mode="single"
                          month={month}
                          onMonthChange={setMonth}
                          selected={field.value}
                          onSelect={(date) => {
                              field.onChange(date);
                              if (date) {
                              setDateInput(format(date, 'dd/MM/yyyy'));
                              setMonth(date);
                              }
                              setIsCalendarOpen(false);
                          }}
                          disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          weekStartsOn={1}
                          />
                      </PopoverContent>
                      </Popover>
                      {calculatedAge !== null && (
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                          ({calculatedAge} anos)
                      </div>
                      )}
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      className="flex flex-col space-y-2 pt-1 sm:flex-row sm:space-y-0 sm:space-x-4"
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
                name="schoolShift"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Turno Escolar</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o turno..."/>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {schoolShifts.map(shift => (
                                    <SelectItem key={shift.id} value={shift.id}>{shift.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator/>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor do Heroi</FormLabel>
              <FormControl>
                 {isLoadingColors ? (
                    <div className="grid grid-cols-8 gap-2">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-10 rounded-full" />
                        ))}
                    </div>
                ) : (
                    <ColorSelector
                      value={field.value as HeroColor}
                      onChange={field.onChange}
                      disabledColors={usedColors}
                    />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator/>

        <div className="space-y-4 rounded-lg border bg-muted/50 p-4 text-sm">
            <h4 className="font-semibold text-foreground">Informações de Criação</h4>
            <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4"/>
                <span>Criado por:</span>
                {isLoadingOwner ? <Skeleton className="h-4 w-24"/> : <span className="font-medium text-foreground">{owner?.name || 'Desconhecido'}</span>}
            </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4"/>
                <span>Data de Criação:</span>
                <span className="font-medium text-foreground">
                    {child.createdAt ? format(child.createdAt.toDate(), 'PPPp', { locale: ptBR }) : 'N/A'}
                </span>
            </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-8 border-t pt-6">
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || isDeleting}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
        </div>
      </form>
      <Separator className="my-8" />
      <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <h3 className="font-semibold text-lg text-destructive flex items-center gap-2"><AlertTriangle/> Zona de Perigo</h3>
        <p className="text-sm text-destructive/90">As ações abaixo são irreversíveis. Tenha certeza do que está fazendo.</p>
        <div className="flex flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isResetting || isDeleting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Redefinir Progresso
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Redefinir o progresso de {child.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação é irreversível. Todas as estrelas, XP, níveis, missões concluídas e recompensas resgatadas serão zeradas. O perfil voltará ao estado inicial.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onResetProgress} className="bg-destructive hover:bg-destructive/90" disabled={isResetting}>
                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sim, Redefinir
                    </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="w-full" disabled={isDeleting || isLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Perfil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de {child.name} e todos os seus dados associados (missões, recompensas, progresso).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteProfile} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sim, Excluir Perfil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </Form>
  );
}
