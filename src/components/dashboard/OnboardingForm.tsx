
"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addChildProfile, addRecurringSchoolEntry } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OnboardingStep1, onboardingSchemaStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2, onboardingSchemaStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3, onboardingSchemaStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4 } from "./steps/OnboardingStep4";
import { OnboardingStep5 } from "./steps/OnboardingStep5";
import { processScheduleText, type ProcessScheduleTextInput, type ProcessScheduleOutput } from "@/ai/flows/process-schedule-text";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TOTAL_STEPS = 5;

// Combine all schemas
const combinedSchema = onboardingSchemaStep1
  .merge(onboardingSchemaStep2)
  .merge(onboardingSchemaStep3);

export type OnboardingFormValues = z.infer<typeof combinedSchema>;

const stepSchemas = [
  onboardingSchemaStep1,
  onboardingSchemaStep2,
  onboardingSchemaStep3,
  z.object({}), // Step 4 has no fields
  z.object({}), // Step 5 has no fields
];


export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentContext } = useFamily();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ProcessScheduleOutput | null>(null);

  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(combinedSchema),
    mode: 'onChange',
    defaultValues: {
      name: "",
      birthDate: undefined,
      gender: "not-informed",
      contextId: currentContext,
      schoolShift: "not_applicable",
      schoolShiftStart: '',
      schoolShiftEnd: '',
      extraActivitiesText: '',
      essentialRoutines: [],
    },
  });

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  const goToNextStep = async () => {
    const currentStepSchema = stepSchemas[step - 1];
    const fieldsToValidate = currentStepSchema.keyof()._def.items as (keyof OnboardingFormValues)[];
    
    const isStepValid = fieldsToValidate.length > 0 ? await methods.trigger(fieldsToValidate) : true;
    
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
      const birthDate = new Date(values.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      const input: ProcessScheduleTextInput = {
          childAge: age,
          childName: values.name,
          schoolShift: values.schoolShift,
          schoolStartTime: values.schoolShiftStart,
          schoolEndTime: values.schoolShiftEnd,
          extraActivities: values.extraActivitiesText,
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
        
        // Add schedule entries based on generated schedule
        if (generatedSchedule && generatedSchedule.schedule) {
            for (const item of generatedSchedule.schedule) {
                if(item.type === 'school_entry' || item.type === 'school_exit') continue; // Handled by shift times
                
                if (item.days && item.days.length > 0) {
                     await addRecurringSchoolEntry({
                        subject: item.activity,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        color: '#a855f7', // Default color for AI generated
                        childId: newChild.id,
                        ownerId: user.uid,
                        familyId: values.contextId === 'my-space' ? null : values.contextId,
                    }, item.days, user);
                }
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
      <div className="space-y-6">
        <Progress value={progress} className="w-full" />
        
        <div className="min-h-[450px]">
            {step === 1 && <OnboardingStep1 />}
            {step === 2 && <OnboardingStep2 />}
            {step === 3 && <OnboardingStep3 />}
            {step === 4 && <OnboardingStep4 isLoading={isLoading} childName={methods.getValues('name')} />}
            {step === 5 && <OnboardingStep5 schedule={generatedSchedule} />}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
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
