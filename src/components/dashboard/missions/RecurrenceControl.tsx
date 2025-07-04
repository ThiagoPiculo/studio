
"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { format, setHours, setMinutes, setSeconds, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Settings2, Sun, CloudSun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { RecurrenceRule } from "@/lib/types"
import { weekdayLabels } from "@/lib/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [tempDate, setTempDate] = React.useState<Date | undefined>(undefined);

  // When popover opens, sync tempDate with the external value, snapping minutes
  React.useEffect(() => {
    if (isOpen) {
      let initialDate: Date | undefined = undefined;
      if (value && isValid(value)) {
        const minutes = value.getMinutes();
        const roundedMinutes = Math.round(minutes / 15) * 15;
        if (roundedMinutes === 60) {
            // Handle rounding up to the next hour
            initialDate = setHours(setMinutes(value, 0), value.getHours() + 1);
        } else {
            initialDate = setMinutes(value, roundedMinutes);
        }
      }
      setTempDate(initialDate);
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
    const currentHours = tempDate ? tempDate.getHours() : 9; // Default to 9 AM
    const currentMinutes = tempDate ? tempDate.getMinutes() : 0;
    let newDate = setHours(selectedDate, currentHours);
    newDate = setMinutes(newDate, currentMinutes);
    newDate = setSeconds(newDate, 0);
    setTempDate(newDate);
  };

  const handleHourChange = (hour: string) => {
    const newHour = parseInt(hour, 10);
    if (!isNaN(newHour)) {
        const baseDate = tempDate || new Date(); // If no date, use now
        const newDate = setHours(baseDate, newHour);
        setTempDate(newDate);
    }
  };

  const handleMinuteChange = (minute: string) => {
    const newMinute = parseInt(minute, 10);
    if (!isNaN(newMinute)) {
        const baseDate = tempDate || new Date(); // If no date, use now
        const newDate = setMinutes(baseDate, newMinute);
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
            <Label>Horário</Label>
            <div className="flex items-center gap-1">
              <Select
                value={tempDate ? format(tempDate, "HH") : undefined}
                onValueChange={handleHourChange}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                  })}
                </SelectContent>
              </Select>
              <span>:</span>
              <Select
                value={tempDate ? format(tempDate, "mm") : undefined}
                onValueChange={handleMinuteChange}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {['00', '15', '30', '45'].map(minute => (
                    <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
               <FormDescription className="text-xs space-y-1">
                <span>A hora aqui define o período na agenda:</span>
                <div className="flex items-center gap-4 text-muted-foreground/80">
                  <span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5" /> Manhã</span>
                  <span className="flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" /> Tarde</span>
                  <span className="flex items-center gap-1"><Moon className="h-3.5 w-3.5" /> Noite</span>
                </div>
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
                   <FormDescription className="text-xs space-y-1">
                    <span>Para missões únicas, esta é a data de vencimento. A hora define o período na agenda:</span>
                    <div className="flex items-center gap-4 text-muted-foreground/80">
                      <span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5" /> Manhã</span>
                      <span className="flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" /> Tarde</span>
                      <span className="flex items-center gap-1"><Moon className="h-3.5 w-3.5" /> Noite</span>
                    </div>
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
