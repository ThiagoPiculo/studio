
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
import { useState, useEffect, useMemo, useRef } from "react";
import { getChildProfilesByFamily, getChildProfilesByOwner, updateChildProfile, getUserProfile, uploadAvatarAndUpdateProfile } from "@/lib/firebase/firestore";
import type { ChildProfile, HeroColor, UserProfile, SchoolShift } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Calendar as CalendarIcon, RotateCcw, AlertTriangle, User, Clock, RefreshCw, Camera } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse, isValid, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { heroColors } from "@/lib/hero-colors";
import { ColorSelector } from "./ColorSelector";
import { Skeleton } from "../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { schoolShifts } from "@/lib/types";
import { TimePicker } from "./school-schedule/TimePicker";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  color: z.string().refine((val) => heroColors.includes(val as HeroColor), {
    message: "Por favor, selecione uma cor válida."
  }),
}).superRefine((data, ctx) => {
  const isShiftApplicable = data.schoolShift !== 'not_applicable';
  if (isShiftApplicable) {
    if (!data.schoolShiftStart || !/^\d{2}:\d{2}$/.test(data.schoolShiftStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftStart'],
        message: 'O horário de início é obrigatório.',
      });
    }
    if (!data.schoolShiftEnd || !/^\d{2}:\d{2}$/.test(data.schoolShiftEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftEnd'],
        message: 'O horário de término é obrigatório.',
      });
    }
    if (data.schoolShiftStart && data.schoolShiftEnd && data.schoolShiftEnd <= data.schoolShiftStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftEnd'],
        message: 'O horário final deve ser depois do inicial.',
      });
    }
  }
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditChildProfileFormProps {
  child: ChildProfile;
  onProfileUpdate: () => void;
}

export function EditChildProfileForm({ child, onProfileUpdate }: EditChildProfileFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateInput, setDateInput] = useState<string>("");
  const [month, setMonth] = useState<Date>(child.birthDate?.toDate() || new Date());
  
  const [usedColors, setUsedColors] = useState<HeroColor[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(child.avatar || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: child.name || "",
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      schoolShift: child.schoolShift || 'not_applicable',
      schoolShiftStart: child.schoolShiftStart || '',
      schoolShiftEnd: child.schoolShiftEnd || '',
      color: child.color || heroColors[0], 
    },
  });
  
  const watchedSchoolShift = form.watch("schoolShift");

  useEffect(() => {
    form.reset({
      name: child.name || "",
      birthDate: child.birthDate?.toDate(),
      gender: child.gender || "not-informed",
      schoolShift: child.schoolShift || 'not_applicable',
      schoolShiftStart: child.schoolShiftStart || '',
      schoolShiftEnd: child.schoolShiftEnd || '',
      color: child.color || heroColors[0],
    });
    setAvatarPreview(child.avatar || null);
    if (child.birthDate) {
      setMonth(child.birthDate.toDate());
    }
  }, [child, form]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      
      setIsUploadingAvatar(true);
      try {
        await uploadAvatarAndUpdateProfile(child.id, file);
        toast({ title: "Avatar Atualizado!", description: "A nova foto do seu herói foi salva." });
        onProfileUpdate(); // Refetch data on parent to update avatar everywhere
      } catch (error) {
        toast({ title: "Erro no Upload", description: "Não foi possível enviar a imagem.", variant: "destructive" });
        setAvatarFile(null);
        setAvatarPreview(child.avatar || null); // Revert preview on error
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleShiftChange = (value: string) => {
    form.setValue('schoolShift', value as SchoolShift, { shouldValidate: true });
    switch (value) {
        case 'morning':
            form.setValue('schoolShiftStart', '08:00', { shouldValidate: true });
            form.setValue('schoolShiftEnd', '12:00', { shouldValidate: true });
            break;
        case 'afternoon':
            form.setValue('schoolShiftStart', '13:00', { shouldValidate: true });
            form.setValue('schoolShiftEnd', '17:00', { shouldValidate: true });
            break;
        case 'full_time':
            form.setValue('schoolShiftStart', '08:00', { shouldValidate: true });
            form.setValue('schoolShiftEnd', '17:00', { shouldValidate: true });
            break;
        case 'not_applicable':
            form.setValue('schoolShiftStart', '', { shouldValidate: true });
            form.setValue('schoolShiftEnd', '', { shouldValidate: true });
            break;
    }
  };

  useEffect(() => {
    const fetchAuxiliaryData = async () => {
        if (!child || !user) {
            setIsLoadingColors(false);
            setIsLoadingOwner(false);
            return;
        };
        
        setIsLoadingColors(true);
        setIsLoadingOwner(true);

        const currentChildContextId = child.familyId || 'my-space';

        try {
            // Fetch used colors within the correct context
            let otherChildren: ChildProfile[] = [];
            const familyIdToQuery = currentChildContextId === 'my-space' ? null : currentChildContextId;

            if (familyIdToQuery) {
                otherChildren = await getChildProfilesByFamily(familyIdToQuery);
            } else {
                otherChildren = await getChildProfilesByOwner(user.uid, true);
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
  }, [child, user]);


  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    
    try {
      const updates: Partial<ChildProfile> = {
        name: data.name,
        birthDate: Timestamp.fromDate(data.birthDate),
        gender: data.gender,
        schoolShift: data.schoolShift,
        schoolShiftStart: data.schoolShift !== 'not_applicable' ? data.schoolShiftStart : '',
        schoolShiftEnd: data.schoolShift !== 'not_applicable' ? data.schoolShiftEnd : '',
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
  
  const isOwner = user?.uid === child.ownerId;
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  return (
    <>
    <div className="flex flex-col sm:flex-row gap-6 mb-6 items-center sm:items-start">
        <div className="relative group flex-shrink-0">
          <Avatar className="h-28 w-28 text-4xl shadow-md ring-4 ring-offset-2 ring-primary ring-offset-background">
            <AvatarImage src={avatarPreview || undefined} alt={child.name} />
            <AvatarFallback 
              className="font-bold"
              style={{ backgroundColor: child.color }}
            >{getInitials(child.name)}</AvatarFallback>
          </Avatar>
          {isUploadingAvatar && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          {isOwner && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md group-hover:bg-primary group-hover:text-primary-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start flex-grow w-full">
            <FormItem>
              <FormLabel>Nome do Mini Heroi</FormLabel>
              <FormControl>
                  <Input placeholder="Nome do Mini Heroi" {...form.register("name")} disabled={!isOwner} />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>
            <FormItem className="flex flex-col">
              <FormLabel>Data de Nascimento</FormLabel>
              <div className="flex items-center gap-4">
                  <Popover open={isCalendarOpen} onOpenChange={(open) => {
                  if (open) {
                      setDateInput(form.getValues("birthDate") ? format(form.getValues("birthDate"), 'dd/MM/yyyy') : "");
                  }
                  setIsCalendarOpen(open);
                  }}>
                  <PopoverTrigger asChild>
                      <FormControl>
                      <Button
                          variant={"outline"}
                          className={cn(
                          "w-full pl-3 text-left font-normal",
                          !watchedBirthDate && "text-muted-foreground"
                          )}
                          disabled={!isOwner}
                      >
                          {watchedBirthDate ? (
                          format(watchedBirthDate, "PPP", { locale: ptBR })
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
                                  form.setValue("birthDate", parsedDate, { shouldValidate: true });
                                  setMonth(parsedDate);
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
                      selected={watchedBirthDate}
                      onSelect={(date) => {
                          if (date) {
                            form.setValue("birthDate", date, { shouldValidate: true });
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
              <FormMessage>{form.formState.errors.birthDate?.message}</FormMessage>
              </FormItem>
        </div>
    </div>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={!isOwner} className="space-y-6 group">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                  <FormItem className="space-y-3">
                  <FormLabel>Gênero do Mini Heroi</FormLabel>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                    <FormField
                        control={form.control}
                        name="schoolShift"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Turno Escolar</FormLabel>
                                <Select onValueChange={handleShiftChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o turno..."/></SelectTrigger></FormControl>
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
                {watchedSchoolShift && watchedSchoolShift !== 'not_applicable' && (
                    <>
                        <FormField
                            control={form.control}
                            name="schoolShiftStart"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início do Turno</FormLabel>
                                    <FormControl><TimePicker {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="schoolShiftEnd"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim do Turno</FormLabel>
                                    <FormControl><TimePicker {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-sm h-full">
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
                   <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4"/>
                      <span>Última Atualização:</span>
                      <span className="font-medium text-foreground">
                          {child.updatedAt ? format(child.updatedAt.toDate(), 'PPPp', { locale: ptBR }) : 'N/A'}
                      </span>
                  </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center justify-end gap-2 mt-8 border-t pt-6">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar Alterações
                  </Button>
              </div>
            )}
        </fieldset>
      </form>
    </Form>
    </>
  );
}
