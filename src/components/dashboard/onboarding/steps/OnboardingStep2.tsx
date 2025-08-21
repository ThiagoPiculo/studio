
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TimePicker } from "../../school-schedule/TimePicker";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import * as z from "zod";

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
    switch (shift) {
      case 'morning':
        setValue('schoolShiftStart', '07:00');
        setValue('schoolShiftEnd', '12:00');
        break;
      case 'afternoon':
        setValue('schoolShiftStart', '13:00');
        setValue('schoolShiftEnd', '18:00');
        break;
      case 'full_time':
        setValue('schoolShiftStart', '08:00');
        setValue('schoolShiftEnd', '17:00');
        break;
      case 'not_applicable':
        setValue('schoolShiftStart', '');
        setValue('schoolShiftEnd', '');
        break;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">A Missão Principal de {childName}</h2>
        <p className="text-muted-foreground">Todo herói tem uma base de treinamento! Para que eu possa criar o melhor 'Mapa do Tempo', vamos marcar o horário em que {childName} está na escola.</p>
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
                            <Label htmlFor={s.id} className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary">
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
                <FormControl><TimePicker {...field} /></FormControl>
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
