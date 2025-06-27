
"use client"

import * as React from "react"
import { useController, useFormContext } from "react-hook-form"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Repeat } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { RecurrenceRule, RecurrenceFrequency, Weekday } from "@/lib/types"
import { weekdays, weekdayLabels } from "@/lib/types"
import { Timestamp } from "firebase/firestore"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

type CustomRecurrenceState = {
  freq: RecurrenceFrequency
  interval: number
  byDay: Weekday[]
  endCondition: 'never' | 'on' | 'after'
  endDate?: Date
  count?: number
}

function generateRecurrenceSummary(rule: RecurrenceRule | null | undefined): string {
  if (!rule) {
    return 'Não se repete'
  }

  const { freq, interval, byDay, endDate, count } = rule
  let summary = ''

  if (interval === 1) {
    switch (freq) {
      case 'DAILY':
        summary = 'Diariamente'
        break
      case 'WEEKLY':
        if (byDay && byDay.length > 0) {
          const sortedDays = byDay.slice().sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b))
          if (sortedDays.length === 7) {
            summary = 'Diariamente'
          } else if (sortedDays.length === 1) {
            summary = `Toda semana, na ${weekdayLabels[sortedDays[0]].long}`
          } else {
            summary = `Semanalmente em dias específicos`
          }
        } else {
          summary = 'Semanalmente'
        }
        break
      case 'MONTHLY':
        summary = 'Mensalmente'
        break
      case 'YEARLY':
        summary = 'Anualmente'
        break
      default:
        summary = 'Personalizado'
    }
  } else {
    const freqText = { DAILY: 'dias', WEEKLY: 'semanas', MONTHLY: 'meses', YEARLY: 'anos' }[freq]
    summary = `A cada ${interval} ${freqText}`
    if (freq === 'WEEKLY' && byDay && byDay.length > 0) {
      summary += ' em dias específicos'
    }
  }

  if (endDate) {
    summary += `, até ${format(endDate.toDate(), 'P', { locale: ptBR })}`
  } else if (count) {
    summary += `, por ${count} vezes`
  }

  return summary
}

export function RecurrenceControl() {
  const { control } = useFormContext()
  const { field } = useController({ name: 'recurrenceRule', control })
  
  const [isOpen, setIsOpen] = React.useState(false)
  
  const currentRule: RecurrenceRule | null = field.value || null
  const summary = generateRecurrenceSummary(currentRule);

  const [customState, setCustomState] = React.useState<CustomRecurrenceState>({
    freq: 'WEEKLY',
    interval: 1,
    byDay: [],
    endCondition: 'never',
  })

  React.useEffect(() => {
    if (isOpen) {
      setCustomState({
        freq: currentRule?.freq || 'WEEKLY',
        interval: currentRule?.interval || 1,
        byDay: currentRule?.byDay || [],
        endCondition: currentRule?.endDate ? 'on' : currentRule?.count ? 'after' : 'never',
        endDate: currentRule?.endDate?.toDate(),
        count: currentRule?.count,
      })
    }
  }, [isOpen, currentRule])

  const handleCustomSave = () => {
    const newRule: RecurrenceRule = {
      freq: customState.freq,
      interval: customState.interval,
    }
    if (customState.freq === 'WEEKLY') {
      newRule.byDay = customState.byDay.length > 0 ? customState.byDay : undefined;
    }
    if (customState.endCondition === 'on' && customState.endDate) {
      newRule.endDate = Timestamp.fromDate(customState.endDate)
    }
    if (customState.endCondition === 'after' && customState.count) {
      newRule.count = customState.count
    }
    field.onChange(newRule)
    setIsOpen(false)
  }
  
  const handleSimpleSelect = (value: string) => {
    if (value === 'null') {
      field.onChange(null);
    } else if (value === 'daily') {
      field.onChange({ freq: 'DAILY', interval: 1 });
    } else if (value === 'weekly') {
      field.onChange({ freq: 'WEEKLY', interval: 1 });
    } else if (value === 'custom') {
      setIsOpen(true);
    }
  }

  return (
    <FormItem>
      <FormLabel>Repetição</FormLabel>
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <Repeat className="mr-2 h-4 w-4" />
              {summary}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Personalizar repetição</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="interval" className="flex-shrink-0">Repetir a cada</Label>
                <Input
                  id="interval"
                  type="number"
                  value={customState.interval}
                  onChange={(e) => setCustomState(s => ({ ...s, interval: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className="w-20"
                />
                <Select
                  value={customState.freq}
                  onValueChange={(v) => setCustomState(s => ({ ...s, freq: v as RecurrenceFrequency }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">{customState.interval > 1 ? 'dias' : 'dia'}</SelectItem>
                    <SelectItem value="WEEKLY">{customState.interval > 1 ? 'semanas' : 'semana'}</SelectItem>
                    <SelectItem value="MONTHLY" disabled>{customState.interval > 1 ? 'meses' : 'mês'}</SelectItem>
                    <SelectItem value="YEARLY" disabled>{customState.interval > 1 ? 'anos' : 'ano'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {customState.freq === 'WEEKLY' && (
                <div>
                  <Label className="text-sm font-medium">Repetir em</Label>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={customState.byDay}
                    onValueChange={(v: Weekday[]) => setCustomState(s => ({...s, byDay: v}))}
                    className="mt-2 justify-start gap-1"
                  >
                    {weekdays.map(day => (
                      <ToggleGroupItem key={day} value={day} className="h-8 w-8 p-0" aria-label={weekdayLabels[day].long}>{weekdayLabels[day].short}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              )}

              <div className="space-y-2">
                 <Label className="text-sm font-medium">Termina</Label>
                 <RadioGroup value={customState.endCondition} onValueChange={(v) => setCustomState(s => ({...s, endCondition: v as 'never' | 'on' | 'after'}))}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never" id="never"/>
                        <Label htmlFor="never" className="font-normal">Nunca</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="on" id="on"/>
                        <Label htmlFor="on" className="font-normal flex-grow">Em</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-[200px] justify-start text-left font-normal", !customState.endDate && "text-muted-foreground")}
                                disabled={customState.endCondition !== 'on'}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customState.endDate ? format(customState.endDate, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={customState.endDate}
                                onSelect={(date) => setCustomState(s => ({...s, endDate: date, endCondition: 'on'}))}
                                initialFocus
                                locale={ptBR}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="after" id="after"/>
                        <Label htmlFor="after" className="font-normal">Após</Label>
                        <Input 
                            type="number"
                            value={customState.count || ''}
                            onChange={(e) => setCustomState(s => ({...s, count: Math.max(1, parseInt(e.target.value, 10) || 1), endCondition: 'after'}))}
                            className="w-20"
                            disabled={customState.endCondition !== 'after'}
                        />
                         <Label htmlFor="after" className="font-normal">ocorrências</Label>
                    </div>
                 </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => field.onChange(null)}>Limpar</Button>
              <Button onClick={handleCustomSave}>Concluído</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </FormItem>
  )
}
