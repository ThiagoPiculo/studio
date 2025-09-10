
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
import { TimePicker } from "./TimePicker"

const periodTimeRanges = {
    morning: { start: 6, end: 11, default: '09:00', label: 'Manhã (06:00 - 11:59)' },
    afternoon: { start: 12, end: 17, default: '14:00', label: 'Tarde (12:00 - 17:59)' },
    night: { start: 18, end: 22, default: '19:00', label: 'Noite (18:00 - 22:59)' },
};

const getPeriodFromDate = (date: Date | null | undefined): 'morning' | 'afternoon' | 'night' => {
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
  
  const currentStartDate = watch('startDate');
  const currentDueDate = watch('dueDate');

  const [selectedPeriod, setSelectedPeriod] = React.useState<'morning' | 'afternoon' | 'night'>(
    getPeriodFromDate(isRecurring ? currentStartDate : currentDueDate)
  );
  
  const updateDateTime = (date: Date, period: 'morning' | 'afternoon' | 'night', time?: string) => {
      const [hour, minute] = (time || periodTimeRanges[period].default).split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hour, minute, 0, 0);
      return newDate;
  };

  const handleDateChange = (date: Date | undefined, fieldName: 'startDate' | 'dueDate') => {
    if (date) {
        const fieldToUpdate = isRecurring ? 'startDate' : 'dueDate';
        const currentTime = getValues(fieldToUpdate) ? format(getValues(fieldToUpdate), 'HH:mm') : periodTimeRanges[selectedPeriod].default;
        const newDateTime = updateDateTime(date, selectedPeriod, currentTime);
        setValue(fieldName, newDateTime, { shouldValidate: true });
    }
  };
  
  const handlePeriodChange = (period: 'morning' | 'afternoon' | 'night') => {
    if (!period) return;
    setSelectedPeriod(period);
    const fieldToUpdate = isRecurring ? 'startDate' : 'dueDate';
    const currentDate = getValues(fieldToUpdate) as Date | null;
    if (currentDate) {
        const newDateTime = updateDateTime(currentDate, period);
        setValue(fieldToUpdate, newDateTime, { shouldValidate: true });
    }
  };

  const handleTimeChange = (time: string) => {
      const fieldToUpdate = isRecurring ? 'startDate' : 'dueDate';
      const currentDate = getValues(fieldToUpdate) as Date | null;
      if (currentDate) {
          const [hour, minute] = time.split(':').map(Number);
          const newDateTime = new Date(currentDate);
          newDateTime.setHours(hour, minute);
          setValue(fieldToUpdate, newDateTime, { shouldValidate: true });
      }
  }

  const timeValue = format(isRecurring ? currentStartDate || new Date() : currentDueDate || new Date(), 'HH:mm');
  const timeRange = periodTimeRanges[selectedPeriod];

  const dateField = isRecurring ? "startDate" : "dueDate";
  const dateLabel = isRecurring ? "Data de Início da Recorrência" : "Data da Missão";

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
                      const oldDateField = checked ? 'dueDate' : 'startDate';
                      const oldDateValue = getValues(oldDateField) as Date | null;
                      const preservedTime = oldDateValue ? format(oldDateValue, 'HH:mm') : periodTimeRanges[selectedPeriod].default;
                      const [hour, minute] = preservedTime.split(':').map(Number);

                      const newDate = new Date();
                      newDate.setHours(hour, minute, 0, 0);
                      
                      field.onChange(checked);
                      
                      if (checked) {
                          setValue('dueDate', null, { shouldValidate: true });
                          setValue('startDate', newDate, { shouldValidate: true });
                          setValue('recurrenceRule', { freq: 'DAILY', interval: 1 }, { shouldValidate: true });
                      } else {
                          setValue('startDate', null, { shouldValidate: true });
                          setValue('recurrenceRule', null, { shouldValidate: true });
                          setValue('dueDate', newDate, { shouldValidate: true });
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
                className="grid grid-cols-3 gap-2"
            >
                <ToggleGroupItem value="morning" aria-label="Manhã" className="flex-col h-auto gap-1 py-2 data-[state=on]:bg-yellow-500/10 data-[state=on]:border-yellow-500/30 data-[state=on]:text-yellow-700">
                    <Sun className="h-5 w-5 text-yellow-500"/> Manhã
                </ToggleGroupItem>
                <ToggleGroupItem value="afternoon" aria-label="Tarde" className="flex-col h-auto gap-1 py-2 data-[state=on]:bg-orange-500/10 data-[state=on]:border-orange-500/30 data-[state=on]:text-orange-700">
                    <CloudSun className="h-5 w-5 text-orange-500"/> Tarde
                </ToggleGroupItem>
                <ToggleGroupItem value="night" aria-label="Noite" className="flex-col h-auto gap-1 py-2 data-[state=on]:bg-indigo-500/10 data-[state=on]:border-indigo-500/30 data-[state=on]:text-indigo-700">
                    <Moon className="h-5 w-5 text-indigo-500"/> Noite
                </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground text-center">{timeRange.label}</p>
        </div>

        <div className="space-y-2 animate-in fade-in duration-300">
            <FormField
                control={control}
                name={dateField}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dateLabel}</FormLabel>
                         <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={(d) => handleDateChange(d, dateField)} initialFocus locale={ptBR} weekStartsOn={1} />
                                </PopoverContent>
                            </Popover>
                            <TimePicker value={timeValue} onChange={handleTimeChange} minHour={timeRange.start} maxHour={timeRange.end} minuteStep={5} />
                         </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {isRecurring && (
            <div className="space-y-2 animate-in fade-in duration-300">
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
        )}
    </div>
  )
}
