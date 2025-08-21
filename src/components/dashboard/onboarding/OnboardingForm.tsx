
"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addChildProfile, addMissionTemplate, addMissionInstance } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OnboardingStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4 } from "./steps/OnboardingStep4";
import { OnboardingStep5 } from "./steps/OnboardingStep5";
import { processScheduleText, type ProcessScheduleTextInput, type ProcessScheduleOutput } from "@/ai/flows/process-schedule-text";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isValid, parse, format, addDays } from "date-fns";
import type { MissionTemplate, Weekday } from "@/lib/types";
import { weekdayLabels } from "@/lib/types";

const TOTAL_STEPS = 5;

// Schema for an individual activity
const activitySchema = z.object({
  name: z.string(),
  emoji: z.string(),
  days: z.array(z.string()),
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
  extraActivities: z.array(activitySchema).optional(),
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
export type ActivityFormValues = z.infer<typeof activitySchema>;


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
      schoolShift: "not_applicable",
      schoolShiftStart: '',
      schoolShiftEnd: '',
      extraActivities: [],
      essentialRoutines: [],
    },
  });

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  const goToNextStep = async () => {
    let isStepValid = false;
    if (step === 1) {
        isStepValid = await methods.trigger(['name', 'birthDate', 'gender', 'contextId']);
    } else if (step === 2) {
        isStepValid = await methods.trigger(['schoolShift', 'schoolShiftStart', 'schoolShiftEnd']);
    } else if (step === 3) {
        isStepValid = await methods.trigger(['extraActivities', 'essentialRoutines']);
    } else {
        isStepValid = true; // For steps without validation
    }
    
    if (isStepValid) {
      if (step < TOTAL_STEPS) {
        if (step === 3) {
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
  
  const handleGenerateSchedule = async () => {
      setIsLoading(true);
      const values = methods.getValues();
      const birthDate = new Date(values.birthDate as string);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      // Format the user-defined activities into descriptive strings
      const selectedActivitiesForAI = values.extraActivities?.map(act => {
          const dayLabels = act.days?.map(d => weekdayLabels[d as Weekday].short).join(', ');
          return `${act.name} (${act.emoji}) - Agendado para ${dayLabels || 'N/A'} às ${act.time || 'N/A'}`;
      }) || [];

      const input: ProcessScheduleTextInput = {
          childAge: age,
          childName: values.name,
          schoolShift: values.schoolShift,
          schoolStartTime: values.schoolShiftStart,
          schoolEndTime: values.schoolShiftEnd,
          selectedActivities: selectedActivitiesForAI,
          essentialRoutines: values.essentialRoutines
      };

      try {
          const schedule = await processScheduleText(input);
          setGeneratedSchedule(schedule);
      } catch (error) {
          console.error("Error generating schedule:", error);
          toast({ title: "Erro Mágico!", description: "O Mago da Organização teve um probleminha para criar a rotina. Tente novamente.", variant: "destructive" });
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
        
        if (generatedSchedule && generatedSchedule.schedule) {
            for (const item of generatedSchedule.schedule) {
                 if (item.type === 'school_entry' || item.type === 'school_exit') continue;

                 const [hour, minute] = item.startTime.split(':').map(Number);
                 const startDate = new Date();
                 startDate.setHours(hour, minute, 0, 0);
                 
                 const templatePayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
                    ownerId: user.uid,
                    familyId: values.contextId === 'my-space' ? null : values.contextId,
                    title: item.activity,
                    emoji: item.emoji,
                    category: item.type === 'essential_routine' ? 'health' : 'hobbies',
                    starsReward: 10,
                    xpReward: 15,
                    isRecurring: item.days.length > 0,
                    startDate: startDate,
                    dueDate: addDays(startDate, 1),
                    recurrenceRule: item.days.length > 0 ? {
                        freq: 'WEEKLY',
                        interval: 1,
                        byDay: item.days as any[],
                    } : null,
                };
                
                const createdTemplate = await addMissionTemplate(user, templatePayload);
                
                const instanceData = {
                    templateId: createdTemplate.id,
                    childId: newChild.id,
                    ownerId: user.uid,
                    familyId: values.contextId === 'my-space' ? null : values.contextId,
                };
                
                await addMissionInstance(user, instanceData, createdTemplate);
            }
        }
        
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
      <div className="flex flex-col space-y-4 h-full">
        <Progress value={progress} className="w-full" />
        
        <div className="flex-1 overflow-y-auto pr-2">
            {step === 1 && <OnboardingStep1 />}
            {step === 2 && <OnboardingStep2 />}
            {step === 3 && <OnboardingStep3 />}
            {step === 4 && <OnboardingStep4 isLoading={isLoading} childName={methods.getValues('name')} />}
            {step === 5 && <OnboardingStep5 schedule={generatedSchedule} />}
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={goToPreviousStep} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
              <Button type="button" variant="link" onClick={() => router.push('/dashboard/heroes')}>
                Pular
              </Button>
              {step < TOTAL_STEPS && (
                <Button type="button" onClick={goToNextStep} disabled={isLoading}>
                  {step === 3 ? "Gerar Rotina Mágica" : "Próximo"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === TOTAL_STEPS && (
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Confirmar e Iniciar a Aventura! 🚀
                </Button>
              )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
