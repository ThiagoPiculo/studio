
"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider, FieldError, FieldErrors } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addMissionTemplate, addMissionInstance, addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft, Wand2, AlertTriangle } from "lucide-react";
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
import { OnboardingStep1, onboardingSchemaStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2, onboardingSchemaStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3, onboardingSchemaStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4, onboardingSchemaStep4, extraActivitySchema } from "./steps/OnboardingStep4";
import { OnboardingStep5, onboardingSchemaStep5 } from "./steps/OnboardingStep5";
import { OnboardingStep6 } from "./steps/OnboardingStep6";

const TOTAL_STEPS = 6;
const DISPLAY_TOTAL_STEPS = TOTAL_STEPS - 1;


// Combine all schemas
const combinedSchema = onboardingSchemaStep1
  .extend(onboardingSchemaStep2.shape)
  .extend(onboardingSchemaStep3.shape)
  .extend(onboardingSchemaStep4.shape)
  .extend(onboardingSchemaStep5.shape);

export type OnboardingFormValues = z.infer<typeof combinedSchema>;
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
  const [generatedSchedule, setGeneratedSchedule] = useState<{ schedule: ScheduleItem[] } | null>(null);
  
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictingActivities, setConflictingActivities] = useState<string[]>([]);
  const [errorToHighlight, setErrorToHighlight] = useState<any | null>(null);


  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(combinedSchema),
    mode: 'onChange',
    defaultValues: {
      name: "",
      birthDate: undefined,
      gender: undefined,
      contextId: currentContext,
      schoolShift: "afternoon",
      schoolShiftStart: '13:00',
      schoolShiftEnd: '17:30',
      wakeUpTime: '08:00',
      lunchTime: '12:20',
      dinnerTime: '18:00',
      sleepTime: '21:30',
      mealsAtSchool: { lunch: false, dinner: false },
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
      case 3: return `Qual o Turno Escolar de ${childName || 'seu Herói'}?`;
      case 4: return "Tudo Tem Sua Hora";
      case 5: return "Adicionando Poderes Extras";
      case 6: return "Definindo a Rotina Essencial";
      case 7: return "Revisando o Mapa da Jornada";
      default: return "Assistente de Criação";
    }
  }, [step, methods]);
  
  const proceedToNextStep = () => {
      if (step < TOTAL_STEPS) {
          if (step === 5) {
              handleGenerateSchedule();
          }
          setErrorToHighlight(null); // Clear highlights when moving
          setStep(prev => prev + 1);
      }
  };

  const goToNextStep = async () => {
    const isStepValid = await methods.trigger();

    if (isStepValid) {
        if (step === 4) {
          const { extraActivities, schoolShift, schoolShiftStart, schoolShiftEnd } = methods.getValues();
          const conflicts = (extraActivities || []).filter(activity => {
            if (schoolShift === 'not_applicable' || !activity.time) return false;
            const activityMinutes = parseTime(activity.time);
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
        const errors = methods.formState.errors;
        const firstErrorKey = Object.keys(errors)[0] as keyof OnboardingFormValues;
        
        if (firstErrorKey === 'extraActivities' && Array.isArray(errors.extraActivities)) {
            const errorArray = errors.extraActivities as FieldErrors<ActivityFormValues>[];
            const errorIndex = errorArray.findIndex(e => e && (e.days || e.time));

            if (errorIndex !== -1) {
                const errorField = errors.extraActivities?.[errorIndex];
                const fieldName = errorField?.days ? 'dias da semana' : 'horário';
                const activityName = methods.getValues(`extraActivities.${errorIndex}.name`);

                setErrorToHighlight({ index: errorIndex, field: fieldName === 'dias da semana' ? 'days' : 'time' });
                
                toast({
                    title: `Pendência em '${activityName}'`,
                    description: `Faltou preencher os ${fieldName}. O painel foi aberto para você.`,
                    variant: "destructive"
                });
                return;
            }
        }

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
      const birthDate = new Date(values.birthDate as string);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      try {
          const schedule = await generateSchedule(values);
          setGeneratedSchedule(schedule);
      } catch (error: any) {
          console.error("Error generating schedule:", error);
          toast({ 
              title: "Erro ao Gerar Rotina", 
              description: error.message || "Não foi possível gerar a rotina. Tente novamente.",
              variant: "destructive" 
          });
          setStep(3); // Go back to the previous step on error
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

        if (generatedSchedule && generatedSchedule.schedule) {
            for (const item of generatedSchedule.schedule) {
                 const missionDetails = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === item.activity);
                 
                 if (!missionDetails) {
                     console.warn(`Could not find predefined mission for: "${item.activity}". Skipping.`);
                     continue;
                 }

                 const templatePayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
                    ownerId: user.uid,
                    familyId: values.contextId === 'my-space' ? null : values.contextId,
                    title: item.activity,
                    emoji: item.emoji,
                    category: missionDetails.suggestedAppCategory,
                    starsReward: missionDetails.starsReward,
                    xpReward: missionDetails.xpReward,
                    isRecurring: true,
                    startDate: new Date().toISOString(),
                    dueDate: addDays(new Date(), 1).toISOString(),
                    recurrenceRule: {
                        freq: 'WEEKLY',
                        interval: 1,
                        byDay: item.days,
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
        <CardHeader className="p-6 space-y-4 pb-0">
            <div className="flex items-center gap-3">
                <Wand2 className="h-8 w-8 text-primary" />
                <div className="flex flex-col">
                    <CardTitle className="text-xl md:text-2xl font-headline">{currentTitle}</CardTitle>
                    <CardDescription>Cadastro guiado e divertido</CardDescription>
                </div>
            </div>
             {step > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm pt-2">
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
                {step === 6 && <OnboardingStep6 isLoading={isLoading} generatedSchedule={generatedSchedule} />}
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
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading || !generatedSchedule} className="shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
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
