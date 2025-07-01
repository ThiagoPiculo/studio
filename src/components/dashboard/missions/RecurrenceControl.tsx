"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { format, setHours, setMinutes, setSeconds, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { RecurrenceRule } from "@/lib/types"
import { weekdayLabels } from "@/lib/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RecurrenceDialog } from './RecurrenceDialog';
import { Timestamp } from "firebase/firestore"
import { formatRecurrenceSummary } from "@/lib/calendar-utils";

interface DateTimePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | undefined) => void;
  label: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | undefined>(value && isValid(value) ? value : undefined);

  React.useEffect(() => {
    if (isOpen) {
      setTempDate(value && isValid(value) ? value : undefined);
    }
  }, [isOpen, value]);

  const handleConfirm = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setTempDate(undefined);
      return;
    }
    const currentHours = tempDate ? tempDate.getHours() : 9;
    const currentMinutes = tempDate ? tempDate.getMinutes() : 0;
    let newDate = setHours(selectedDate, currentHours);
    newDate = setMinutes(newDate, currentMinutes);
    newDate = setSeconds(newDate, 0);
    setTempDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    const [hours, minutes] = time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const baseDate = tempDate || new Date();
      let newDate = setHours(baseDate, hours);
      newDate = setMinutes(newDate, minutes);
      setTempDate(newDate);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value && isValid(value) ? format(value, "PPP, HH:mm", { locale: ptBR }) : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={handleDateSelect}
          initialFocus
          locale={ptBR}
          weekStartsOn={1}
        />
        <div className="flex items-center justify-between p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="time-input">Horário</Label>
            <Input
              id="time-input"
              type="time"
              value={tempDate ? format(tempDate, "HH:mm") : ""}
              onChange={handleTimeChange}
              className="w-auto"
            />
          </div>
          <Button size="sm" onClick={handleConfirm}>OK</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


export function RecurrenceControl() {
  const { control, watch, setValue } = useFormContext();
  const isRecurring = watch('isRecurring');
  const recurrenceRule = watch('recurrenceRule');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

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
                  if (!checked) {
                    setValue('recurrenceRule', null, { shouldValidate: true });
                    setValue('startDate', null, { shouldValidate: true });
                  } else {
                    setValue('dueDate', null, { shouldValidate: true });
                    if (!recurrenceRule) {
                      setValue('recurrenceRule', { freq: 'WEEKLY', interval: 1 }, { shouldValidate: true });
                    }
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

    {isRecurring && (
      <div className="space-y-4 animate-in fade-in duration-300">
        <FormField
          control={control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Início da Recorrência</FormLabel>
              <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha data e hora de início" />
              <FormDescription className="text-xs">
                A hora aqui define o período (Manhã, Tarde, Noite) na agenda.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
          <div className="space-y-2">
            <Label>Regra de Repetição</Label>
            <Button variant="outline" type="button" className="w-full justify-between" onClick={() => setIsDialogOpen(true)}>
              <span className="truncate pr-2">{formatRecurrenceSummary({ isRecurring, recurrenceRule })}</span>
              <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Button>
            <RecurrenceDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialRule={recurrenceRule}
                onSave={(newRule) => setValue('recurrenceRule', newRule, { shouldValidate: true })}
            />
          </div>
      </div>
    )}
    {!isRecurring && (
        <div className="space-y-4 animate-in fade-in duration-300">
            <FormField
              control={control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora da Missão (Prazo)</FormLabel>
                  <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha data e hora do prazo" />
                   <FormDescription className="text-xs">
                    Para missões únicas, esta é a data de vencimento. A hora define o período (Manhã, Tarde, Noite) na agenda.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
    )}
    </div>
  )
}
