
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from "lucide-react";
import * as z from "zod";
import { useState } from "react";
import { Label } from "@/components/ui/label";

export const onboardingSchemaStep1 = z.object({
  name: z.string().min(2, { message: "O nome precisa ter pelo menos 2 caracteres." }),
  birthDate: z.string({ required_error: "A data de nascimento é obrigatória." }).refine(val => val && isValid(parse(val, 'yyyy-MM-dd', new Date())), {
    message: "Data inválida."
  }),
  gender: z.enum(['boy', 'girl', 'not-informed']),
  contextId: z.string(),
});

export function OnboardingStep1() {
  const { control, setValue, watch } = useFormContext();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  
  const birthDateValue = watch('birthDate') ? parse(watch('birthDate'), 'yyyy-MM-dd', new Date()) : null;


  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Saudações, grande líder!</h2>
        <p className="text-muted-foreground">Sou o Hero, seu 'Mago da Organização'. Toda lenda tem um nome. Vamos criar o perfil do Mini Herói que está prestes a iniciar sua jornada?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome ou apelido</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Joãozinho" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de nascimento</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {birthDateValue ? format(birthDateValue, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={ptBR}
                    mode="single"
                    month={month}
                    onMonthChange={setMonth}
                    selected={birthDateValue || undefined}
                    onSelect={(date) => {
                        if(date) {
                            setValue("birthDate", format(date, 'yyyy-MM-dd'));
                        }
                        setIsCalendarOpen(false);
                    }}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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

      <FormField
        control={control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sexo</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <FormItem>
                  <Label htmlFor="gender-boy" className="flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary has-[:checked]:border-primary">
                      <RadioGroupItem value="boy" id="gender-boy" className="sr-only peer" />
                      Masculino
                  </Label>
                </FormItem>
                <FormItem>
                  <Label htmlFor="gender-girl" className="flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary has-[:checked]:border-primary">
                      <RadioGroupItem value="girl" id="gender-girl" className="sr-only peer" />
                      Feminino
                  </Label>
                </FormItem>
                <FormItem>
                  <Label htmlFor="gender-other" className="flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary has-[:checked]:border-primary">
                      <RadioGroupItem value="not-informed" id="gender-other" className="sr-only peer" />
                      Prefiro não informar
                  </Label>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
