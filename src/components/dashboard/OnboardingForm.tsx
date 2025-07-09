
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
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Calendar as CalendarIcon, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import { TimePicker } from "./school-schedule/TimePicker";
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


const onboardingSchema = z.object({
  childName: z.string().min(2, { message: "O nome da criança deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome da criança deve ter 50 caracteres ou menos." }),
  childBirthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
  childGender: z.enum(['boy', 'girl', 'not-informed'], {
    required_error: "Por favor, selecione o gênero.",
  }),
  contextId: z.string(),
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable'], {
      required_error: "Por favor, selecione o turno escolar.",
  }),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
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


type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentContext, availableContexts } = useFamily();
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateInput, setDateInput] = useState<string>("");
  const [month, setMonth] = useState<Date>(new Date());

  const [isConfirming, setIsConfirming] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormValues | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      childName: "",
      childBirthDate: undefined,
      childGender: undefined,
      contextId: currentContext,
      schoolShift: 'afternoon',
      schoolShiftStart: '13:00',
      schoolShiftEnd: '17:00',
    },
  });
  
  // Sync default context if it changes while form is mounted
  useEffect(() => {
    form.setValue('contextId', currentContext);
  }, [currentContext, form]);

  const watchedSchoolShift = form.watch('schoolShift');

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

  const handleFormSubmit = (values: OnboardingFormValues) => {
    if (values.schoolShift !== 'not_applicable') {
      setFormData(values);
      setIsConfirming(true);
    } else {
      handleConfirmSubmission(values);
    }
  };

  const handleConfirmSubmission = async (values: OnboardingFormValues | null) => {
    if (!values) return;
    setIsConfirming(false);
    
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para adicionar uma criança. Por favor, faça login novamente.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      await addChildProfile(user.uid, { 
        name: values.childName, 
        birthDate: Timestamp.fromDate(values.childBirthDate), 
        gender: values.childGender,
        schoolShift: values.schoolShift,
        schoolShiftStart: values.schoolShift !== 'not_applicable' ? values.schoolShiftStart : '',
        schoolShiftEnd: values.schoolShift !== 'not_applicable' ? values.schoolShiftEnd : '',
      }, values.contextId);
      toast({ title: "Mini Heroi Adicionado!", description: `${values.childName} está pronto(a) para a aventura!` });
      router.push("/dashboard/heroes"); 
    } catch (error: any) {
      console.error("Failed to add child profile:", error);
      toast({
        title: "Falha ao Adicionar Mini Heroi",
        description: "Não foi possível adicionar o Mini Heroi. Verifique os dados informados ou tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setFormData(null);
    }
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
  
  const schoolShiftLabel = schoolShifts.find(s => s.id === formData?.schoolShift)?.label;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <FormField
              control={form.control}
              name="childName"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Nome ou Apelido da Criança</FormLabel>
                  <FormControl>
                      <Input placeholder="Ex: Flip Gato" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
              />

              <FormField
              control={form.control}
              name="childBirthDate"
              render={({ field }) => (
                  <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
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
                              placeholder="Digite a data: dd/mm/aaaa"
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
                  <FormMessage />
                  </FormItem>
              )}
              />
          </div>
          
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="childGender"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Gênero do Mini Heroi/Heroina</FormLabel>
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

            {availableContexts.length > 1 && (
              <FormField
                control={form.control}
                name="contextId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adicionar a qual espaço?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um espaço..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableContexts.map(context => (
                          <SelectItem key={context.id} value={context.id}>
                            {context.id === 'my-space' ? context.name : `Aliança: ${context.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                  <FormField
                      control={form.control}
                      name="schoolShift"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Turno Escolar</FormLabel>
                              <Select onValueChange={handleShiftChange} value={field.value}>
                                  <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Selecione..."/>
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
              {watchedSchoolShift !== 'not_applicable' && (
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
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:flex-grow shadow-clay hover:shadow-clay-hover active:shadow-clay-inset rounded-xl h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Adicionar Mini Heroi
            </Button>
          </div>
        </form>
      </Form>
      
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Horário Escolar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você definiu o turno escolar como <strong>{schoolShiftLabel}</strong>, das <strong>{formData?.schoolShiftStart}</strong> às <strong>{formData?.schoolShiftEnd}</strong>. Este horário está correto?
              <br/>
              <span className="text-xs text-muted-foreground mt-2 block">Você poderá alterar isso mais tarde na tela da Agenda Escolar.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFormData(null)}>
                <X className="mr-2 h-4 w-4" /> Não, Corrigir
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmSubmission(formData)}>
                <Check className="mr-2 h-4 w-4" /> Sim, Seguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
