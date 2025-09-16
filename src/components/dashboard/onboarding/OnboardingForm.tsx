
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, FormProvider, FieldError, FieldErrors } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addMissionTemplate, addMissionInstance, addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft, Wand2, AlertTriangle, Tv } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isValid, parse, format, addDays } from "date-fns";
import type { MissionTemplate, Weekday, MissionCategory, SchoolShift, ScheduleItem } from "@/lib/types";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Timestamp } from "firebase/firestore";
import { generateSchedule } from "@/lib/actions/generate-schedule";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { parseTime } from "@/lib/calendar-utils";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4, extraActivitySchema } from "./steps/OnboardingStep4";
import { OnboardingStep5 } from "./steps/OnboardingStep5";
import { OnboardingStep6 } from "./steps/OnboardingStep6";

const TOTAL_STEPS = 6;
const DISPLAY_TOTAL_STEPS = TOTAL_STEPS - 1;

const scheduleItemSchema = z.object({
    activity: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    days: z.array(z.string()),
    type: z.enum(['essential_routine', 'extra_activity', 'school_entry', 'school_exit']),
    emoji: z.string(),
    category: z.string(),
    block: z.string().optional(),
});

// Unified schema for the entire onboarding flow
const onboardingSchema = z.object({
  // Step 1
  name: z.string().min(2, { message: "O nome precisa ter pelo menos 2 caracteres." }),
  birthDate: z.string({ required_error: "A data de nascimento é obrigatória." }).refine(val => val && isValid(parse(val, 'yyyy-MM-dd', new Date())), {
    message: "Data inválida."
  }),
  gender: z.enum(['boy', 'girl', 'not-informed']),
  contextId: z.string(),
  // Step 2
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  mealsAtSchool: z.object({
    lunch: z.boolean().default(false),
    dinner: z.boolean().default(false),
  }),
  // Step 3
  wakeUpTime: z.string({ required_error: "O horário de acordar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  lunchTime: z.string({ required_error: "O horário do almoço é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  dinnerTime: z.string({ required_error: "O horário do jantar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  sleepTime: z.string({ required_error: "O horário de dormir é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  includeScreenTime: z.boolean().default(true),
  screenTime1: z.string().optional(),
  screenTime2: z.string().optional(),
  // Step 4
  extraActivities: z.array(extraActivitySchema).optional(),
  // Step 5
  essentialRoutines: z.array(z.string()).optional(),
  // Step 6 (Final data)
  schedule: z.array(scheduleItemSchema).optional(),
}).superRefine((data, ctx) => { // For cross-field validation from Step 2
    if (data.schoolShift !== 'not_applicable') {
        if (!data.schoolShiftStart) ctx.addIssue({ code: "custom", path: ["schoolShiftStart"], message: "Horário de início é obrigatório." });
        if (!data.schoolShiftEnd) ctx.addIssue({ code: "custom", path: ["schoolShiftEnd"], message: "Horário de fim é obrigatório." });
        if (data.schoolShiftStart && data.schoolShiftEnd && data.schoolShiftEnd <= data.schoolShiftStart) {
            ctx.addIssue({ code: 'custom', path: ['schoolShiftEnd'], message: "O horário final deve ser depois do inicial." });
        }
    }
});


export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
export type ActivityFormValues = z.infer<typeof extraActivitySchema>;

// Extract essential routine names for default values
const essentialRoutinesDefault = predefinedMissionGroups
    .find(g => g.userCategory === 'Rotinas Essencial (diárias)')?.items.map(item => item.title) || [];

function OnboardingFormSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="text-center space-y-2">
                <Skeleton className="h-5 w-3/4 mx-auto" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
}

const OnboardingStep0 = dynamic(() => import('./steps/OnboardingStep0').then(mod => mod.OnboardingStep0), { loading: () => <OnboardingFormSkeleton /> });


export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentContext } = useFamily();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictingActivities, setConflictingActivities] = useState<string[]>([]);
  const [errorToHighlight, setErrorToHighlight] = useState<any | null>(null);

  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      name: "",
      birthDate: undefined,
      gender: "not-informed",
      contextId: currentContext,
      schoolShift: "afternoon",
      schoolShiftStart: '13:00',
      schoolShiftEnd: '17:30',
      wakeUpTime: '08:00',
      lunchTime: '12:15',
      dinnerTime: '18:00',
      sleepTime: '22:00',
      includeScreenTime: true,
      screenTime1: '',
      screenTime2: '',
      mealsAtSchool: { lunch: false, dinner: false },
      extraActivities: [],
      essentialRoutines: essentialRoutinesDefault,
      schedule: [],
    },
  });
  
  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);
  const currentTitle = useMemo(() => {
    const childName = methods.getValues("name");
    switch (step) {
      case 1: return "Assistente de Criação";
      case 2: return "Cadastrando um Novo Herói";
      case 3: return `Qual o Turno Escolar de ${childName || 'seu Herói'}?`;
      case 4: return "Definindo os Horários Essenciais";
      case 5: return "Adicionando Poderes Extras";
      case 6: return "Revisando o Mapa da Jornada";
      default: return "Assistente de Criação";
    }
  }, [step, methods]);

  const proceedToNextStep = async () => {
    if (step === 5) {
        await handleGenerateSchedule();
    } else if (step < TOTAL_STEPS) {
        setStep(prev => prev + 1);
    }
    setErrorToHighlight(null);
  };
  
const stepFields: (keyof OnboardingFormValues)[][] = [
    [], // Step 1 is the intro, no fields.
    ['name', 'birthDate', 'gender', 'contextId'], // Step 2 fields
    ['schoolShift', 'schoolShiftStart', 'schoolShiftEnd'], // Step 3 fields
    ['wakeUpTime', 'lunchTime', 'dinnerTime', 'sleepTime', 'screenTime1', 'screenTime2'], // Step 4 fields
    ['extraActivities'], // Step 5 fields
    ['essentialRoutines'], // Step 6 fields
];


const goToNextStep = async () => {
    if (step >= TOTAL_STEPS) return;

    if (step === 1) {
        setStep(prev => prev + 1);
        return;
    }

    const fieldsToValidate = stepFields[step -1] || [];
    const isStepValid = fieldsToValidate.length > 0 ? await methods.trigger(fieldsToValidate) : true;

    if (isStepValid) {
        if (step === 5) { // Check for conflicts before moving from extra activities
            const { extraActivities, schoolShift, schoolShiftStart, schoolShiftEnd } = methods.getValues();
            const conflicts = (extraActivities || []).filter(activity => {
                if (schoolShift === 'not_applicable' || !activity.startTime) return false;
                const activityMinutes = parseTime(activity.startTime);
                const startMinutes = parseTime(schoolShiftStart!);
                const endMinutes = parseTime(schoolShiftEnd!);
                return activityMinutes >= startMinutes && activityMinutes < endMinutes;
            }).map(a => a.name);

            if (conflicts.length > 0) {
                setConflictingActivities(conflicts);
                setIsConflictDialogOpen(true);
                return;
            }
        }
        proceedToNextStep();
    } else {
        toast({
            title: "Ops! Faltam alguns detalhes.",
            description: "Por favor, corrija os campos marcados antes de continuar.",
            variant: "destructive"
        });
    }
};


  const goToPreviousStep = () => {
    if (step > 1) {
      setErrorToHighlight(null);
      setStep(prev => prev - 1);
    }
  };

  const handleGenerateSchedule = async () => {
      setIsLoading(true);
      const values = methods.getValues();

      try {
          const scheduleData = await generateSchedule(values);
          methods.setValue('schedule', scheduleData.schedule as any);
          setStep(prev => prev + 1);
      } catch (error: any) {
          console.error("Error generating schedule:", error);
          toast({ 
              title: "Erro ao Gerar Rotina", 
              description: error.message || "Não foi possível gerar a rotina. Tente novamente.",
              variant: "destructive" 
          });
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleFinalSubmit = async () => {
    if (!user) {
        toast({ title: "Erro de Autenticação", variant: "destructive" });
        return;
    }
    
    const values = methods.getValues();
    const generatedSchedule = values.schedule;

    if (!generatedSchedule) {
        toast({ title: "Rotina não gerada", description: "A rotina precisa ser gerada antes de finalizar.", variant: "destructive" });
        return;
    }
    setIsLoading(true);

    try {
        const newChild = await addChildProfile(user.uid, {
            name: values.name,
            birthDate: values.birthDate as string,
            gender: values.gender,
            schoolShift: values.schoolShift,
            schoolShiftStart: values.schoolShiftStart,
            schoolShiftEnd: values.schoolShiftEnd,
        }, values.contextId);
        
        const allMissionPromises = [];

        if (generatedSchedule && generatedSchedule.length > 0) {
            for (const item of generatedSchedule) {
                 if (item.type === 'school_entry' || item.type === 'school_exit') continue;
                 
                 const predefinedMission = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === item.activity);
                 const customActivity = values.extraActivities?.find(a => a.name === item.activity);
                 
                 let source: 'predefined' | 'custom' = 'predefined';
                 if (customActivity && customActivity.source === 'custom') {
                    source = 'custom';
                 }

                 let emoji = '✨';
                 let category: MissionCategory = 'essential_routines';
                 let starsReward = 5;

                 if (predefinedMission) {
                     emoji = predefinedMission.emoji;
                     category = predefinedMission.suggestedAppCategory;
                     starsReward = predefinedMission.starsReward;
                 } else if (customActivity) {
                     emoji = customActivity.emoji || '✨';
                     category = 'hobbies';
                 } else {
                     console.warn(`Could not find details for: "${item.activity}". Using defaults.`);
                 }

                 const templatePayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
                    ownerId: user.uid,
                    familyId: values.contextId === 'my-space' ? null : values.contextId,
                    title: item.activity,
                    emoji: emoji,
                    category: category,
                    starsReward: starsReward,
                    isRecurring: true,
                    startDate: new Date().toISOString(),
                    dueDate: addDays(new Date(), 1).toISOString(),
                    recurrenceRule: {
                        freq: 'WEEKLY',
                        interval: 1,
                        byDay: item.days as Weekday[],
                    },
                    source: source,
                };
                
                 allMissionPromises.push(addMissionTemplate(user, templatePayload, [values.contextId]).then(async (template) => {
                    if (!template) return;
                    
                    const [hour, minute] = item.startTime.split(':').map(Number);
                    const startDateWithTime = new Date(template.startDate as string);
                    startDateWithTime.setHours(hour, minute);
                    
                    const finalTemplate = { ...template, startDate: startDateWithTime.toISOString() };

                    await addMissionInstance(user, {
                        templateId: template.id,
                        childId: newChild.id,
                        ownerId: user.uid,
                        familyId: values.contextId === 'my-space' ? null : values.contextId,
                    }, finalTemplate);
                 }));
            }
        }
        
        await Promise.all(allMissionPromises);
        
        toast({ title: "Jornada Iniciada!", description: `${values.name} e sua rotina foram cadastrados com sucesso!` });
        router.push('/dashboard/heroes');

    } catch (error) {
        console.error("Final submission error:", error);
        toast({ title: "Erro Final", description: "Não foi possível salvar o herói e sua rotina.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <Card className="w-full max-w-5xl mx-auto shadow-2xl animate-in fade-in duration-500">
        <CardHeader className="p-6 pb-0 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-center gap-3">
                <Wand2 className="h-8 w-8 text-primary" />
                <div className="flex flex-col">
                    <CardTitle className="text-xl md:text-2xl font-headline">{currentTitle}</CardTitle>
                    <CardDescription>Cadastro guiado e divertido</CardDescription>
                </div>
            </div>
            {step > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm md:pt-2 w-full md:w-auto">
                    <span className="text-muted-foreground font-semibold whitespace-nowrap">
                       Etapa {step - 1} de {DISPLAY_TOTAL_STEPS}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: DISPLAY_TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-2 w-6 rounded-full transition-all",
                                    i + 2 === step ? "bg-primary w-10" :
                                    i + 1 < step - 1 ? "bg-green-500" :
                                    "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-6">
            <div className="min-h-[450px]">
                {step === 1 && <OnboardingStep0 />}
                {step === 2 && <OnboardingStep1 />}
                {step === 3 && <OnboardingStep2 />}
                {step === 4 && <OnboardingStep3 />}
                {step === 5 && <OnboardingStep4 errorToHighlight={errorToHighlight} />}
                {step === 6 && <OnboardingStep6 isLoading={isLoading} />}
            </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center p-6 border-t">
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={goToPreviousStep} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="link">Pular</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sair do Assistente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você sairá do cadastro guiado. Nenhuma informação será salva agora, mas não se preocupe! Você pode voltar e criar um herói com o assistente a qualquer momento pelo menu <strong>'Novo Mini Herói'</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => {}}>
                            Continuar no Assistente
                        </AlertDialogAction>
                        <AlertDialogCancel onClick={() => router.push('/dashboard/heroes')}>
                            Sair Mesmo Assim
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {step < TOTAL_STEPS && (
                <Button type="button" onClick={goToNextStep} disabled={isLoading} className="shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                      <>
                        {step === 1 ? "Começar agora" : step === 5 ? <><Wand2 className="mr-2 h-4 w-4" /> Gerar Rotina de Missões</> : "Próximo"}
                        {step !== 5 && <ArrowRight className="ml-2 h-4 w-4" />}
                      </>
                  )}
                </Button>
              )}
              {step === TOTAL_STEPS && (
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading || !methods.getValues('schedule')} className="shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Confirmar e Iniciar! 🚀
                </Button>
              )}
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-6 w-6"/>
                Conflito de Horários Detectado!
            </AlertDialogTitle>
            <AlertDialogDescription>
              As seguintes atividades estão dentro do período escolar:
              <ul className="list-disc pl-5 mt-2 font-semibold text-foreground">
                {conflictingActivities.map(name => <li key={name}>{name}</li>)}
              </ul>
              <br/>
              Deseja continuar mesmo assim? O ideal é ajustar os horários para evitar sobreposições.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConflictDialogOpen(false)}>Voltar e Ajustar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                setIsConflictDialogOpen(false);
                proceedToNextStep();
            }}>
                Continuar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </FormProvider>
  );
}
