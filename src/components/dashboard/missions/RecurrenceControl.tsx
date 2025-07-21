"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Settings2, Sun, CloudSun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { RecurrenceRule } from "@/lib/types"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { RecurrenceDialog } from './RecurrenceDialog';
import { formatRecurrenceSummary } from "@/lib/calendar-utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Helper to set a default time based on the period of day
const setTimeForPeriod = (date: Date, period: 'morning' | 'afternoon' | 'night'): Date => {
    let hours = 9; // Default to morning
    if (period === 'afternoon') hours = 14;
    if (period === 'night') hours = 20;
    
    const newDate = new Date(date);
    newDate.setHours(hours, 0, 0, 0);
    return newDate;
}

// Helper to get the period from a date object
const getPeriodFromDate = (date: Date | null | undefined): string => {
    if (!date) return 'morning'; // Default period
    const hour = date.getHours();
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18) return 'night';
    return 'morning';
}

export function RecurrenceControl() {
  const { control, watch, setValue, getValues } = useFormContext();
  const isRecurring = watch('isRecurring');
  const recurrenceRule: RecurrenceRule | null = watch('recurrenceRule');
  const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = React.useState(false);
  
  // State to manage the visual period selection
  const currentStartDate = watch('startDate');
  const currentDueDate = watch('dueDate');
  const [selectedPeriod, setSelectedPeriod] = React.useState<'morning' | 'afternoon' | 'night'>(
    getPeriodFromDate(isRecurring ? currentStartDate : currentDueDate)
  );

  const handleDateChange = (date: Date | undefined, fieldName: 'startDate' | 'dueDate') => {
    if (date) {
        const dateWithTime = setTimeForPeriod(date, selectedPeriod);
        setValue(fieldName, dateWithTime, { shouldValidate: true });
    }
  };
  
  const handlePeriodChange = (period: 'morning' | 'afternoon' | 'night') => {
    if (!period) return; // Don't do anything if the same button is clicked again
    setSelectedPeriod(period);
    // Update the existing date with the new time
    const fieldToUpdate = isRecurring ? 'startDate' : 'dueDate';
    const currentDate = getValues(fieldToUpdate) as Date | null;
    if (currentDate) {
        const newDateWithTime = setTimeForPeriod(currentDate, period);
        setValue(fieldToUpdate, newDateWithTime, { shouldValidate: true });
    }
  };


  return (
    <div className="space-y-6 rounded-lg border p-4">
        <FormField
            control={control}
            name="isRecurring"
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
                <div className='space-y-1'>
                    <FormLabel>Repetir Missão</FormLabel>
                    <FormDescription className="text-xs">
                        Defina se a missão ocorre uma única vez ou se repete.
                    </FormDescription>
                </div>
                <FormControl>
                <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                    field.onChange(checked);
                    // Reset fields when switching
                    if (checked) {
                        setValue('dueDate', null, { shouldValidate: true });
                        setValue('startDate', new Date(), { shouldValidate: true });
                        setValue('recurrenceRule', { freq: 'DAILY', interval: 1 }, { shouldValidate: true });
                    } else {
                        setValue('startDate', null, { shouldValidate: true });
                        setValue('recurrenceRule', null, { shouldValidate: true });
                        setValue('dueDate', new Date(), { shouldValidate: true });
                    }
                    }}
                />
                </FormControl>
            </FormItem>
            )}
        />
        
        <div className="space-y-2">
            <Label>Período do Dia</Label>
            <ToggleGroup
                type="single"
                value={selectedPeriod}
                onValueChange={handlePeriodChange}
                className="grid grid-cols-3"
            >
                <ToggleGroupItem value="morning" aria-label="Manhã" className="flex-col h-auto gap-1 py-2">
                    <Sun className="h-5 w-5"/> Manhã
                </ToggleGroupItem>
                <ToggleGroupItem value="afternoon" aria-label="Tarde" className="flex-col h-auto gap-1 py-2">
                    <CloudSun className="h-5 w-5"/> Tarde
                </ToggleGroupItem>
                <ToggleGroupItem value="night" aria-label="Noite" className="flex-col h-auto gap-1 py-2">
                    <Moon className="h-5 w-5"/> Noite
                </ToggleGroupItem>
            </ToggleGroup>
            <FormDescription className="text-xs text-center">Isso define um horário padrão para ordenar as missões na agenda.</FormDescription>
        </div>

        {isRecurring ? (
            <div className="space-y-4 animate-in fade-in duration-300">
                <FormField
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data de Início da Recorrência</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data de início</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={(d) => handleDateChange(d, 'startDate')} initialFocus locale={ptBR} weekStartsOn={1} />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="space-y-2">
                    <Label>Regra de Repetição</Label>
                    <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setIsRecurrenceDialogOpen(true)}>
                        <span className="truncate pr-2">{formatRecurrenceSummary({ isRecurring, recurrenceRule })}</span>
                        <Settings2 className="h-4 w-4 flex-shrink-0" />
                    </Button>
                    <RecurrenceDialog 
                        isOpen={isRecurrenceDialogOpen}
                        onOpenChange={setIsRecurrenceDialogOpen}
                        initialRule={recurrenceRule}
                        onSave={(newRule) => setValue('recurrenceRule', newRule, { shouldValidate: true })}
                    />
                </div>
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
                <FormField
                    control={control}
                    name="dueDate"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Data da Missão Única</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data do prazo</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={(d) => handleDateChange(d, 'dueDate')} initialFocus locale={ptBR} weekStartsOn={1} />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        )}
    </div>
  )
}
