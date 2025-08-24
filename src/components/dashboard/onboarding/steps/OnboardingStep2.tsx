
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TimePicker } from "../../missions/TimePicker";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import * as z from "zod";
import { cn } from "@/lib/utils";

export const onboardingSchemaStep2 = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.schoolShift !== 'not_applicable') {
        if (!data.schoolShiftStart) ctx.addIssue({ code: "custom", path: ["schoolShiftStart"], message: "Horário de início é obrigatório." });
        if (!data.schoolShiftEnd) ctx.addIssue({ code: "custom", path: ["schoolShiftEnd"], message: "Horário de fim é obrigatório." });
        if (data.schoolShiftStart && data.schoolShiftEnd && data.schoolShiftEnd <= data.schoolShiftStart) {
            ctx.addIssue({ code: 'custom', path: ['schoolShiftEnd'], message: "O horário final deve ser depois do inicial." });
        }
    }
});

export function OnboardingStep2() {
  const { control, watch, setValue, getValues } = useFormContext();
  const childName = getValues('name');
  const schoolShift = watch('schoolShift');

  const handleShiftChange = (value: string) => {
    const shift = value as SchoolShift;
    setValue('schoolShift', shift);
    let start = '';
    let end = '';

    switch (shift) {
      case 'morning':
        start = '07:00';
        end = '11:30';
        break;
      case 'afternoon':
        start = '13:00';
        end = '17:30';
        break;
      case 'full_time':
        start = '08:00';
        end = '18:00';
        break;
      case 'not_applicable':
        start = '';
        end = '';
        break;
    }
    setValue('schoolShiftStart', start);
    setValue('schoolShiftEnd', end);
  };
  
  const handleStartTimeChange = (newStartTime: string) => {
    setValue('schoolShiftStart', newStartTime);

    const shift = getValues('schoolShift');
    if (shift !== 'morning' && shift !== 'afternoon') return;

    const [hours, minutes] = newStartTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
        const startDate = new Date();
        startDate.setHours(hours, minutes);
        startDate.setHours(startDate.getHours() + 4);
        startDate.setMinutes(startDate.getMinutes() + 30);
        
        const endHours = startDate.getHours().toString().padStart(2, '0');
        const endMinutes = startDate.getMinutes().toString().padStart(2, '0');

        setValue('schoolShiftEnd', `${endHours}:${endMinutes}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Até os maiores heróis precisam ir para a base de treinamento (a escola 😉). Me diga turno, ajuste hora de entrada e saída, e eu organizo o resto ✨</p>
      </div>

      <FormField
        control={control}
        name="schoolShift"
        render={({ field }) => (
          <FormItem>
            <FormControl>
                <RadioGroup onValueChange={handleShiftChange} value={field.value} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {schoolShifts.map(s => (
                        <FormItem key={s.id}>
                            <FormControl>
                                <RadioGroupItem value={s.id} id={s.id} className="sr-only peer" />
                            </FormControl>
                            <Label 
                                htmlFor={s.id} 
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors h-full",
                                    field.value === s.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                                )}
                            >
                                {s.label}
                            </Label>
                        </FormItem>
                    ))}
                </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {schoolShift !== 'not_applicable' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg animate-in fade-in duration-300">
          <FormField
            control={control}
            name="schoolShiftStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Entrada</FormLabel>
                <FormControl>
                    <TimePicker {...field} onChange={handleStartTimeChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="schoolShiftEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Saída</FormLabel>
                <FormControl><TimePicker {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
