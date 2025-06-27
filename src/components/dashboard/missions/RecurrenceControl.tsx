
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
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RecurrenceDialog } from './RecurrenceDialog'; // Import the new dialog
import { Timestamp } from "firebase/firestore"

interface DateTimePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | undefined) => void;
  label: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label }) => {
  const [date, setDate] = React.useState<Date | undefined>(value ?? undefined);
  const [time, setTime] = React.useState(value && isValid(value) ? format(value, "HH:mm") : "09:00");

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const [hours, minutes] = time.split(':').map(Number);
    let newDate = setHours(selectedDate, hours);
    newDate = setMinutes(newDate, minutes);
    newDate = setSeconds(newDate, 0);
    setDate(newDate);
    onChange(newDate);
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (!date) return;
    const [hours, minutes] = newTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      let newDate = setHours(date, hours);
      newDate = setMinutes(newDate, minutes);
      setDate(newDate);
      onChange(newDate);
    }
  }

  React.useEffect(() => {
    if (value && isValid(value)) {
      setDate(value);
      setTime(format(value, "HH:mm"));
    } else if (value === null || value === undefined) {
      setDate(undefined);
      setTime("09:00");
    }
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date && isValid(date) ? format(date, "PPP, HH:mm", { locale: ptBR }) : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          locale={ptBR}
        />
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="time-input">Horário</Label>
            <Input id="time-input" type="time" value={time} onChange={handleTimeChange} className="w-auto" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatRecurrenceSummary(rule: RecurrenceRule | null | undefined): string {
    if (!rule) return "Personalizar repetição...";
    
    let summary = "";
    switch (rule.freq) {
        case 'DAILY': summary = `A cada ${rule.interval} dia(s)`; break;
        case 'WEEKLY': summary = `A cada ${rule.interval} semana(s)`; break;
        case 'MONTHLY': summary = `A cada ${rule.interval} mês(es)`; break;
        case 'YEARLY': summary = `A cada ${rule.interval} ano(s)`; break;
        default: summary = "Regra personalizada";
    }

    if (rule.byDay && rule.byDay.length > 0 && rule.freq === 'WEEKLY') {
        summary += ` em ${rule.byDay.join(', ')}`;
    }
    
    if (rule.endDate) {
        const date = (rule.endDate as Timestamp).toDate();
        summary += `, até ${format(date, 'dd/MM/yy')}`;
    } else if (rule.count) {
        summary += `, ${rule.count} vezes`;
    }

    return summary;
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
            <FormLabel>Repetir Missão</FormLabel>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (!checked) {
                    setValue('recurrenceRule', null, { shouldValidate: true });
                  } else if (!recurrenceRule) {
                    // Set a default recurrence rule when switched on for the first time
                    setValue('recurrenceRule', { freq: 'WEEKLY', interval: 1 }, { shouldValidate: true });
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="space-y-4 animate-in fade-in duration-300">
        <FormField
          control={control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isRecurring ? 'Data de Início da Recorrência' : 'Data e Hora da Missão'}</FormLabel>
              <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha data e hora" />
              <FormMessage />
            </FormItem>
          )}
        />
        {isRecurring && (
          <div className="space-y-2">
            <Label>Regra de Repetição</Label>
            <Button variant="outline" type="button" className="w-full justify-between" onClick={() => setIsDialogOpen(true)}>
              <span className="truncate pr-2">{formatRecurrenceSummary(recurrenceRule)}</span>
              <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Button>
            <RecurrenceDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialRule={recurrenceRule}
                onSave={(newRule) => setValue('recurrenceRule', newRule, { shouldValidate: true })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
