
"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addMissionTemplate, addMissionInstance, addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { OnboardingStep0 } from "./steps/OnboardingStep0";
import { OnboardingStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4 } from "./steps/OnboardingStep4";
import { OnboardingStep5 } from "./steps/OnboardingStep5";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isValid, parse, format, addDays } from "date-fns";
import type { MissionTemplate, Weekday, MissionCategory, SchoolShift } from "@/lib/types";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Timestamp } from "firebase/firestore";
import { processScheduleText, type ProcessScheduleTextInput, type ProcessScheduleOutput } from "@/ai/flows/process-schedule-text";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const TOTAL_STEPS = 6;
const DISPLAY_TOTAL_STEPS = TOTAL_STEPS - 1;


// Schema for an individual activity from step 3
const extraActivitySchema = z.object({
  name: z.string(),
  days: z.array(z.string()).min(1, "Selecione pelo menos um dia."),
  time: z.string(),
});

// Unified schema for the entire onboarding flow
const onboardingSchema = z.object({
  name: z.string().min(2, { message: "O nome precisa ter pelo menos 2 caracteres." }),
  birthDate: z.string({ required_error: "A data de nascimento é obrigatória." }).refine(val => val && isValid(parse(val, 'yyyy-MM-dd', new Date())), {
    message: "Data inválida."
  }),
  gender: z.enum(['boy', 'girl', 'not-informed']),
  contextId: z.string(),
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  extraActivities: z.array(extraActivitySchema).optional(),
  essentialRoutines: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
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


export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentContext } = useFamily();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ProcessScheduleOutput | null>(null);

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
      extraActivities: [],
      essentialRoutines: essentialRoutinesDefault,
    },
  });

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);
  const currentTitle = useMemo(() => {
    const childName = methods.getValues("name");
    switch (step) {
      case 1: return "Assistente de Criação";
      case 2: return "Cadastrando um Novo Herói";
      case 3: return `Qual Hora da Escola (Turno) de ${childName}?`;
      case 4: return "Adicionando Poderes Extras";
      case 5: return "Definindo a Rotina Essencial";
      case 6: return "Revisando o Mapa da Jornada";
      default: return "Assistente de Criação";
    }
  }, [step, methods]);

  const goToNextStep = async () => {
    let isStepValid = false;
    if (step === 1) {
        isStepValid = true; // No validation for welcome step
    } else if (step === 2) {
        isStepValid = await methods.trigger(['name', 'birthDate', 'gender', 'contextId']);
    } else if (step === 3) {
        isStepValid = await methods.trigger(['schoolShift', 'schoolShiftStart', 'schoolShiftEnd']);
    } else if (step === 4) {
        isStepValid = await methods.trigger(['extraActivities']);
    } else if (step === 5) {
        isStepValid = true; 
    }

    if (isStepValid) {
      if (step < TOTAL_STEPS) {
        if (step === 5) { 
            await handleGenerateSchedule();
        }
        setStep(prev => prev + 1);
      }
    }
  };

  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleScheduleChange = (index: number, newTime: string) => {
    if (generatedSchedule) {
      const newSchedule = { ...generatedSchedule };
      newSchedule.schedule[index].startTime = newTime;
      // Re-sort schedule based on new time
      newSchedule.schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setGeneratedSchedule(newSchedule);
    }
  };

  const handleGenerateSchedule = async () => {
      setIsLoading(true);
      setGeneratedSchedule(null);
      const values = methods.getValues();
      const birthDate = new Date(values.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      const input: ProcessScheduleTextInput = {
          childAge: age,
          childName: values.name,
          schoolShift: values.schoolShift,
          schoolStartTime: values.schoolShiftStart,
          schoolEndTime: values.schoolShiftEnd,
          extraActivities: (values.extraActivities || []).map(act => `${act.name} nos dias ${act.days.join(', ')} às ${act.time}`).join('; '),
          essentialRoutines: values.essentialRoutines
      };

      try {
          const schedule = await processScheduleText(input);
          setGeneratedSchedule(schedule);
      } catch (error) {
          console.error("Error generating schedule:", error);
          toast({ title: "Erro Mágico!", description: "O Mago da Organização teve um probleminha para criar a rotina. Tente novamente.", variant: "destructive" });
          setStep(4); // Go back to the previous step on error
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleFinalSubmit = async () => {
    if (!user) {
        toast({ title: "Erro de Autenticação", variant: "destructive" });
        return;
    }
    if (!generatedSchedule) {
        toast({ title: "Rotina não gerada", description: "A rotina precisa ser gerada antes de finalizar.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    const values = methods.getValues();

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

        for (const item of generatedSchedule.schedule) {
             const missionDetails = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === item.activity);
             
             if (!missionDetails) {
                 console.warn(`Could not find predefined mission for: "${item.activity}". Skipping.`);
                 continue; // Pula esta iteração se a missão não for encontrada
             }

             const templatePayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
                ownerId: user.uid,
                familyId: values.contextId === 'my-space' ? null : values.contextId,
                title: item.activity,
                emoji: missionDetails.emoji, // Garante o emoji correto
                category: missionDetails.suggestedAppCategory, // Garante a categoria correta
                starsReward: missionDetails.starsReward,
                xpReward: missionDetails.xpReward,
                isRecurring: true,
                startDate: new Date().toISOString(),
                dueDate: addDays(new Date(), 1).toISOString(),
                recurrenceRule: {
                    freq: 'WEEKLY',
                    interval: 1,
                    byDay: item.days as Weekday[],
                },
            };
            
             allMissionPromises.push(addMissionTemplate(user, templatePayload).then(async (template) => {
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
        <CardHeader className="p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Wand2 className="h-8 w-8 text-primary" />
                <div className="flex flex-col">
                    <CardTitle className="text-xl md:text-2xl font-headline">{currentTitle}</CardTitle>
                    <CardDescription>Cadastro guiado e divertido</CardDescription>
                </div>
            </div>
             {step > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm">
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
        <CardContent className="p-6">
            {step === 1 && <OnboardingStep0 />}
            {step === 2 && <OnboardingStep1 />}
            {step === 3 && <OnboardingStep2 />}
            {step === 4 && <OnboardingStep3 />}
            {step === 5 && <OnboardingStep4 />}
            {step === 6 && <OnboardingStep5 schedule={generatedSchedule} isLoading={isLoading} onScheduleChange={handleScheduleChange} childName={methods.getValues("name")} />}
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
                        {step === 1 ? "Começar agora" : step === 5 ? "Gerar Rotina Mágica" : "Próximo"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                  )}
                </Button>
              )}
              {step === TOTAL_STEPS && (
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading || !generatedSchedule} className="shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Confirmar e Iniciar! 🚀
                </Button>
              )}
          </div>
        </CardFooter>
      </Card>
    </FormProvider>
  );
}
