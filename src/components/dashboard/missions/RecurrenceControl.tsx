
"use client"

import * as React from "react"
import { useFormContext, Controller } from "react-hook-form"
import { format, setHours, setMinutes, setSeconds, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { RecurrenceFrequency, Weekday } from "@/lib/types"
import { weekdays, weekdayLabels } from "@/lib/types"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | undefined) => void;
  label: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label }) => {
  const [date, setDate] = React.useState<Date | undefined>(value ?? undefined);
  const [time, setTime] = React.useState(value ? format(value, "HH:mm") : "09:00");

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP, HH:mm", { locale: ptBR }) : <span>{label}</span>}
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

export function RecurrenceControl() {
  const { control, watch, setValue } = useFormContext();
  const isRecurring = watch('isRecurring');

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
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />

        {isRecurring ? (
            <div className="space-y-4 animate-in fade-in duration-300">
                <FormField
                    control={control}
                    name="recurrenceRule.freq"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Frequência</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a frequência..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="DAILY">Diariamente</SelectItem>
                                    <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {watch('recurrenceRule.freq') === 'WEEKLY' && (
                    <FormField
                        control={control}
                        name="recurrenceRule.byDay"
                        render={({ field }) => (
                            <FormItem>
                                 <FormLabel>Repetir nos dias</FormLabel>
                                 <FormControl>
                                    <ToggleGroup
                                        type="multiple"
                                        variant="outline"
                                        value={field.value || []}
                                        onValueChange={field.onChange}
                                        className="flex flex-wrap justify-start gap-1"
                                    >
                                        {weekdays.map(day => (
                                        <ToggleGroupItem
                                            key={day}
                                            value={day}
                                            className={cn("h-9 w-9 p-0", (day === 'SA' || day === 'SU') && "bg-muted/50")}
                                            aria-label={weekdayLabels[day].long}
                                        >
                                            {weekdayLabels[day].short}
                                        </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                <FormField
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data de Início</FormLabel>
                            <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha a data de início" />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data de Fim (Opcional)</FormLabel>
                             <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha a data de término" />
                            <FormDescription>A missão deixará de se repetir após esta data.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

            </div>
        ) : (
             <div className="animate-in fade-in duration-300">
                 <FormField
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data e Hora da Missão</FormLabel>
                            <DateTimePicker value={field.value} onChange={field.onChange} label="Escolha data e hora" />
                             <FormDescription>Para missões que acontecem apenas uma vez.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        )}
    </div>
  )
}
