
"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { addMissionTemplate, addMissionInstance, addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OnboardingStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3 } from "./steps/OnboardingStep3";
import { OnboardingStep4 } from "./steps/OnboardingStep4";
import { OnboardingStep5 } from "./steps/OnboardingStep5";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isValid, parse, format, addDays, addMinutes, subHours, subMinutes, setHours, setMinutes, addHours } from "date-fns";
import type { MissionTemplate, Weekday, MissionCategory, SchoolShift } from "@/lib/types";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Timestamp } from "firebase/firestore";

const TOTAL_STEPS = 5;

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

export interface ScheduleItem {
    activity: string;
    emoji: string;
    type: 'school_entry' | 'school_exit' | 'extra_activity' | 'essential_routine' | 'free_time';
    category: string;
    startTime: string;
    endTime: string;
    days: Weekday[];
}

export interface ProcessScheduleOutput {
  schedule: ScheduleItem[];
  freeTime: string;
}

// ====================================================================
// NEW LOGIC-BASED SCHEDULE GENERATOR
// ====================================================================

const missionsMap = new Map(predefinedMissionGroups.flatMap(g => g.items).map(item => [item.title, item]));

const createEvent = (
  title: string, 
  startTime: Date, 
  durationMinutes: number, 
  days: Weekday[], 
  type: ScheduleItem['type'] = 'essential_routine'
): ScheduleItem => {
  const missionDetails = missionsMap.get(title);
  return {
    activity: title,
    emoji: missionDetails?.emoji || '📋',
    category: missionDetails?.suggestedAppCategory || 'home',
    startTime: format(startTime, 'HH:mm'),
    endTime: format(addMinutes(startTime, durationMinutes), 'HH:mm'),
    days,
    type,
  };
};

const parseTimeString = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const generateDeterministicSchedule = (input: OnboardingFormValues): ProcessScheduleOutput => {
  const schedule: ScheduleItem[] = [];
  const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
  const weekend: Weekday[] = ['SA', 'SU'];
  const allWeekdays: Weekday[] = [...weekdays, ...weekend];

  // Add extra activities first
  if (input.extraActivities) {
    input.extraActivities.forEach(activity => {
      const startTime = parseTimeString(activity.time);
      schedule.push(createEvent(activity.name, startTime, 60, activity.days as Weekday[], 'extra_activity'));
    });
  }

  // --- Weekday Schedule ---
  if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
    const schoolStart = parseTimeString(input.schoolShiftStart);
    const schoolEnd = parseTimeString(input.schoolShiftEnd);
    
    schedule.push(createEvent('Entrada na Escola', schoolStart, 0, weekdays, 'school_entry'));
    schedule.push(createEvent('Saída da Escola', schoolEnd, 0, weekdays, 'school_exit'));

    if (input.schoolShift === 'morning') {
      const wakeUpTime = subHours(schoolStart, 1);
      const breakfastTime = addMinutes(wakeUpTime, 20);
      const brushTeethMorningTime = addMinutes(breakfastTime, 20);
      const bathTime = addMinutes(wakeUpTime, 25);
      const leaveForSchoolTime = subMinutes(schoolStart, 20);
      const lunchTime = setHours(new Date(), 13);
      const brushTeethAfterLunch = addMinutes(lunchTime, 30);
      const homeworkTime = addMinutes(brushTeethAfterLunch, 15);
      
      const lastEveningActivityEnd = schedule.filter(s => s.type === 'extra_activity')
        .map(s => parseTimeString(s.endTime))
        .reduce((latest, current) => current > latest ? current : latest, new Date(0));
        
      const dinnerBaseTime = lastEveningActivityEnd.getTime() > 0 ? lastEveningActivityEnd : setHours(new Date(), 19, 0);
      const dinnerTime = addMinutes(dinnerBaseTime, 20);
      const brushTeethAfterDinner = addMinutes(dinnerTime, 30);
      const packBagTime = setHours(new Date(), 20, 45);
      const bedTime = setHours(new Date(), 21, 0);
      
      if (input.essentialRoutines?.includes('Hora de acordar')) schedule.push(createEvent('Hora de acordar', wakeUpTime, 15, weekdays));
      if (input.essentialRoutines?.includes('Tomar café da manhã')) schedule.push(createEvent('Tomar café da manhã', breakfastTime, 20, weekdays));
      if (input.essentialRoutines?.includes('Escovar os dentes (após acordar)')) schedule.push(createEvent('Escovar os dentes (após acordar)', brushTeethMorningTime, 15, weekdays));
      if (input.essentialRoutines?.includes('Tomar banho')) schedule.push(createEvent('Tomar banho', bathTime, 20, weekdays));
      if (input.essentialRoutines?.includes('Sair para escola')) schedule.push(createEvent('Sair para escola', leaveForSchoolTime, 20, weekdays));
      if (input.essentialRoutines?.includes('Almoçar')) schedule.push(createEvent('Almoçar', lunchTime, 30, weekdays));
      if (input.essentialRoutines?.includes('Escovar os dentes (após almoço)')) schedule.push(createEvent('Escovar os dentes (após almoço)', brushTeethAfterLunch, 15, weekdays));
      if (input.essentialRoutines?.includes('Fazer a lição de casa')) schedule.push(createEvent('Fazer a lição de casa', homeworkTime, 60, weekdays));
      if (input.essentialRoutines?.includes('Jantar')) schedule.push(createEvent('Jantar', dinnerTime, 30, weekdays));
      if (input.essentialRoutines?.includes('Escovar os dentes (após jantar)')) schedule.push(createEvent('Escovar os dentes (após jantar)', brushTeethAfterDinner, 15, weekdays));
      if (input.essentialRoutines?.includes('Organizar a mochila para amanhã')) schedule.push(createEvent('Organizar a mochila para amanhã', packBagTime, 15, weekdays));
      if (input.essentialRoutines?.includes('Hora de dormir')) schedule.push(createEvent('Hora de dormir', bedTime, 15, weekdays));

    } else if (input.schoolShift === 'afternoon') {
        const wakeUpTime = setHours(new Date(), 8, 30);
        const breakfastTime = addMinutes(wakeUpTime, 20);
        const brushTeethMorningTime = addMinutes(breakfastTime, 20);
        const homeworkTime = setHours(new Date(), 9, 30);
        const waterTimeMorning = setHours(new Date(), 9, 50);
        const freePlayTime = setHours(new Date(), 10, 0);
        const bathTime = subMinutes(schoolStart, 70); // 11:50
        const lunchTime = subMinutes(schoolStart, 50); // 12:10
        const brushTeethAfterLunch = subMinutes(schoolStart, 30); // 12:30
        const leaveForSchoolTime = subMinutes(schoolStart, 20); // 12:40

        const lastEveningActivityEnd = schedule.filter(s => s.type === 'extra_activity')
            .map(s => parseTimeString(s.endTime))
            .reduce((latest, current) => current > latest ? current : latest, new Date(0));
            
        const dinnerBaseTime = lastEveningActivityEnd.getTime() > 0 ? lastEveningActivityEnd : schoolEnd;
        const dinnerTime = addMinutes(dinnerBaseTime, 20); // Ex: 17:30 + 20min = 17:50 if no extras
        const waterTimeNight = addMinutes(dinnerTime, 30);
        const bedTime = setHours(new Date(), 22, 0);
        const packBagTime = subMinutes(bedTime, 30);
        const brushTeethNightTime = subMinutes(bedTime, 20);
        
        if (input.essentialRoutines?.includes('Hora de acordar')) schedule.push(createEvent('Hora de acordar', wakeUpTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Tomar café da manhã')) schedule.push(createEvent('Tomar café da manhã', breakfastTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Escovar os dentes (após acordar)')) schedule.push(createEvent('Escovar os dentes (após acordar)', brushTeethMorningTime, 10, weekdays));
        if (input.essentialRoutines?.includes('Fazer a lição de casa')) schedule.push(createEvent('Fazer a lição de casa', homeworkTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Beber água')) schedule.push(createEvent('Beber água', waterTimeMorning, 10, allWeekdays));
        if (input.essentialRoutines?.includes('Hora livre para brincar')) {
             const hasConflict = schedule.some(item => 
                item.type === 'extra_activity' && 
                parseTimeString(item.startTime) < addMinutes(freePlayTime, 110) && 
                parseTimeString(item.endTime) > freePlayTime
            );
            if (!hasConflict) {
                 schedule.push(createEvent('Hora livre para brincar', freePlayTime, 110, weekdays, 'free_time'));
            }
        }
        if (input.essentialRoutines?.includes('Tomar banho')) schedule.push(createEvent('Tomar banho', bathTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Almoçar')) schedule.push(createEvent('Almoçar', lunchTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Escovar os dentes (após almoço)')) schedule.push(createEvent('Escovar os dentes (após almoço)', brushTeethAfterLunch, 10, weekdays));
        if (input.essentialRoutines?.includes('Sair para escola')) schedule.push(createEvent('Sair para escola', leaveForSchoolTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Jantar')) schedule.push(createEvent('Jantar', dinnerTime, 20, allWeekdays));
        if (input.essentialRoutines?.includes('Beber água')) schedule.push(createEvent('Beber água', waterTimeNight, 10, allWeekdays));
        if (input.essentialRoutines?.includes('Organizar a mochila para amanhã')) schedule.push(createEvent('Organizar a mochila para amanhã', packBagTime, 10, allWeekdays));
        if (input.essentialRoutines?.includes('Escovar os dentes (após jantar)')) schedule.push(createEvent('Escovar os dentes (após jantar)', brushTeethNightTime, 10, allWeekdays));
        if (input.essentialRoutines?.includes('Hora de dormir')) schedule.push(createEvent('Hora de dormir', bedTime, 15, allWeekdays));

    } else if (input.schoolShift === 'full_time') {
        const wakeUpTime = subHours(schoolStart, 1);
        const brushTeethMorningTime = addMinutes(wakeUpTime, 30);
        const leaveForSchoolTime = subMinutes(schoolStart, 20);
        const bedTime = setHours(new Date(), 21, 0);
        const brushTeethBedtime = subMinutes(bedTime, 20);
        
        if (input.essentialRoutines?.includes('Hora de acordar')) schedule.push(createEvent('Hora de acordar', wakeUpTime, 15, weekdays));
        if (input.essentialRoutines?.includes('Escovar os dentes (após acordar)')) schedule.push(createEvent('Escovar os dentes (após acordar)', brushTeethMorningTime, 15, weekdays));
        if (input.essentialRoutines?.includes('Sair para escola')) schedule.push(createEvent('Sair para escola', leaveForSchoolTime, 20, weekdays));
        if (input.essentialRoutines?.includes('Escovar os dentes (antes de dormir)')) schedule.push(createEvent('Escovar os dentes (antes de dormir)', brushTeethBedtime, 15, weekdays));
        if (input.essentialRoutines?.includes('Hora de dormir')) schedule.push(createEvent('Hora de dormir', bedTime, 15, weekdays));
    }
  }

  // --- Weekend Schedule ---
  const weekdayWakeUp = schedule.find(s => s.activity === 'Hora de acordar');
  const weekendWakeUpTime = weekdayWakeUp ? addHours(parseTimeString(weekdayWakeUp.startTime), 1) : setHours(new Date(), 9, 0);
  const weekendBreakfastTime = addMinutes(weekendWakeUpTime, 20);
  const weekendBrushTeethMorningTime = addMinutes(weekendBreakfastTime, 20);
  const weekendDinnerTime = setHours(new Date(), 20, 0);
  const weekendBrushTeethDinnerTime = addMinutes(weekendDinnerTime, 30);
  const weekendBedtime = setHours(new Date(), 22, 0);
  const sundayPackBag = setHours(new Date(), 21, 0);

  if (input.essentialRoutines?.includes('Hora de acordar')) schedule.push(createEvent('Hora de acordar', weekendWakeUpTime, 15, weekend));
  if (input.essentialRoutines?.includes('Tomar café da manhã')) schedule.push(createEvent('Tomar café da manhã', weekendBreakfastTime, 20, weekend));
  if (input.essentialRoutines?.includes('Escovar os dentes (após acordar)')) schedule.push(createEvent('Escovar os dentes (após acordar)', weekendBrushTeethMorningTime, 15, weekend));
  if (input.essentialRoutines?.includes('Jantar')) schedule.push(createEvent('Jantar', weekendDinnerTime, 30, weekend));
  if (input.essentialRoutines?.includes('Escovar os dentes (após jantar)')) schedule.push(createEvent('Escovar os dentes (após jantar)', weekendBrushTeethDinnerTime, 15, weekend));
  if (input.essentialRoutines?.includes('Hora de dormir')) schedule.push(createEvent('Hora de dormir', weekendBedtime, 15, weekend));
  if (input.essentialRoutines?.includes('Organizar a mochila para amanhã')) schedule.push(createEvent('Organizar a mochila para amanhã', sundayPackBag, 15, ['SU']));

  const freeTimeSummary = "A rotina foi montada! Os principais blocos de tempo livre para brincadeiras e descanso parecem ser no período da tarde durante a semana e na maior parte do fim de semana.";

  // Sort final schedule
  schedule.sort((a,b) => a.startTime.localeCompare(b.startTime));

  return { schedule, freeTime: freeTimeSummary };
};

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
        isStepValid = await methods.trigger(['extraActivities']);
    } else if (step === 4) {
        isStepValid = true; 
    }

    if (isStepValid) {
      if (step < TOTAL_STEPS) {
        if (step === 4) { 
            handleGenerateSchedule();
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

  const handleGenerateSchedule = () => {
      setIsLoading(true);
      setGeneratedSchedule(null);
      const values = methods.getValues();
      
      try {
          const schedule = generateDeterministicSchedule(values);
          setGeneratedSchedule(schedule);
      } catch (error) {
          console.error("Error generating schedule:", error);
          toast({ title: "Erro na Lógica!", description: "Ocorreu um erro ao montar a rotina. Verifique os dados e tente novamente.", variant: "destructive" });
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
             
             if (!missionDetails) continue;

             const templatePayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
                ownerId: user.uid,
                familyId: values.contextId === 'my-space' ? null : values.contextId,
                title: item.activity,
                emoji: item.emoji,
                category: item.category as MissionCategory,
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
      <div className="flex flex-col space-y-4 h-full">
        <Progress value={progress} className="w-full" />
        
        <div className="flex-1 overflow-y-auto pr-2 min-h-[400px] sm:min-h-[450px]">
            {step === 1 && <OnboardingStep1 />}
            {step === 2 && <OnboardingStep2 />}
            {step === 3 && <OnboardingStep3 />}
            {step === 4 && <OnboardingStep4 />}
            {step === 5 && <OnboardingStep5 schedule={generatedSchedule} isLoading={isLoading} onScheduleChange={handleScheduleChange} />}
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
                  {step === 4 ? "Gerar Rotina Mágica" : "Próximo"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === TOTAL_STEPS && (
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading || !generatedSchedule}>
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
