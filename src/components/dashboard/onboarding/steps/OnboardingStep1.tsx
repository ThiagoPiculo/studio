"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parse, isValid, differenceInYears } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from "lucide-react";
import * as z from "zod";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { useFamily } from "@/contexts/FamilyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const { availableContexts } = useFamily();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  
  const birthDateValue = watch('birthDate') ? parse(watch('birthDate'), 'yyyy-MM-dd', new Date()) : null;
  const [dateInput, setDateInput] = useState<string>(
    birthDateValue ? format(birthDateValue, "dd/MM/yyyy") : ""
  );

  const calculateAge = (birthDate: Date | null): number | null => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), birthDate);
  };
  const calculatedAge = calculateAge(birthDateValue);


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

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center space-y-1">
        <p className="text-muted-foreground">Vamos criar o perfil do Mini Herói que está prestes a iniciar sua jornada?</p>
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
              <div className="flex items-center gap-4">
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
                    <div className="p-2 border-b">
                        <Input
                            placeholder="Digite: dd/mm/aaaa"
                            value={dateInput}
                            onChange={(e) => {
                                const maskedValue = handleDateMask(e.target.value);
                                setDateInput(maskedValue);
                                if (maskedValue.length === 10) {
                                    const parsedDate = parse(maskedValue, 'dd/MM/yyyy', new Date());
                                    if (isValid(parsedDate)) {
                                        setValue("birthDate", format(parsedDate, 'yyyy-MM-dd'));
                                        setMonth(parsedDate);
                                        setIsCalendarOpen(false); // Close on valid manual entry
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
                        selected={birthDateValue || undefined}
                        onSelect={(date) => {
                            if(date) {
                                setValue("birthDate", format(date, 'yyyy-MM-dd'));
                                setDateInput(format(date, 'dd/MM/yyyy'));
                            }
                            setIsCalendarOpen(false);
                        }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        weekStartsOn={1}
                    />
                    </PopoverContent>
                </Popover>
                {calculatedAge !== null && (
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    ({calculatedAge} anos)
                </div>
                )}
              </div>
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
            <FormLabel>Gênero</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-3 gap-4"
              >
                <FormItem>
                  <Label 
                    htmlFor="gender-boy" 
                    className={cn(
                        "flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors h-full",
                        field.value === 'boy' ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                      <RadioGroupItem value="boy" id="gender-boy" className="sr-only" />
                      Menino
                  </Label>
                </FormItem>
                <FormItem>
                  <Label 
                    htmlFor="gender-girl" 
                    className={cn(
                        "flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors h-full",
                        field.value === 'girl' ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                      <RadioGroupItem value="girl" id="gender-girl" className="sr-only" />
                      Menina
                  </Label>
                </FormItem>
                <FormItem>
                  <Label 
                    htmlFor="gender-other" 
                    className={cn(
                        "flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors h-full",
                        field.value === 'not-informed' ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                      <RadioGroupItem value="not-informed" id="gender-other" className="sr-only" />
                      Não informar
                  </Label>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

       {availableContexts.length > 1 && (
        <FormField
          control={control}
          name="contextId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Onde este herói será gerenciado?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um espaço..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableContexts.map(context => (
                    <SelectItem key={context.id} value={context.id}>
                      {context.id === 'my-space' ? "Cuidar Solo (sem colaboração)" : `Na Aliança: ${context.name}`}
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
  );
}
