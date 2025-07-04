
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { RecurrenceRule, Weekday, RecurrenceFrequency } from '@/lib/types';
import { weekdays, weekdayLabels } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface RecurrenceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (rule: RecurrenceRule) => void;
  initialRule: RecurrenceRule | null | undefined;
}

type EndCondition = 'never' | 'on' | 'after';

// Helper to safely get a JS Date object from various possible inputs
const getInitialEndDate = (rule: RecurrenceRule | null | undefined): Date | undefined => {
    if (!rule || !rule.endDate) return undefined;
    
    const endDateValue = rule.endDate as any;
    
    // Already a valid JS Date
    if (endDateValue instanceof Date && isValid(endDateValue)) {
        return endDateValue;
    }
    // Firestore Timestamp
    if (typeof endDateValue.toDate === 'function') {
        const date = endDateValue.toDate();
        if (isValid(date)) return date;
    }
    // Plain object from form state that mimics a Timestamp
    if (typeof endDateValue === 'object' && 'seconds' in endDateValue && 'nanoseconds' in endDateValue) {
      const date = new Timestamp(endDateValue.seconds, endDateValue.nanoseconds).toDate();
      if (isValid(date)) return date;
    }

    return undefined;
};

export function RecurrenceDialog({ isOpen, onOpenChange, onSave, initialRule }: RecurrenceDialogProps) {
  const [freq, setFreq] = useState<RecurrenceFrequency>(initialRule?.freq || 'WEEKLY');
  const [interval, setInterval] = useState<number>(initialRule?.interval || 1);
  const [byDay, setByDay] = useState<Weekday[]>(initialRule?.byDay || []);
  const [endCondition, setEndCondition] = useState<EndCondition>(() => {
    if (initialRule?.endDate) return 'on';
    if (initialRule?.count) return 'after';
    return 'never';
  });
  const [endDate, setEndDate] = useState<Date | undefined>(getInitialEndDate(initialRule));
  const [count, setCount] = useState<number>(initialRule?.count || 1);

  useEffect(() => {
    if (isOpen) {
      setFreq(initialRule?.freq || 'WEEKLY');
      setInterval(initialRule?.interval || 1);
      setByDay(initialRule?.byDay || []);
      setEndDate(getInitialEndDate(initialRule));
      setCount(initialRule?.count || 1);
      if (initialRule?.endDate) setEndCondition('on');
      else if (initialRule?.count) setEndCondition('after');
      else setEndCondition('never');
    }
  }, [isOpen, initialRule]);

  const handleSave = () => {
    const finalRule: RecurrenceRule = {
      freq,
      interval: Math.max(1, interval || 1),
      endDate: null,
      count: null,
    };

    if (freq === 'WEEKLY' && byDay.length > 0) {
      finalRule.byDay = byDay;
    }

    if (endCondition === 'on' && endDate) {
      finalRule.endDate = endDate as any;
    } else if (endCondition === 'after' && count > 0) {
      finalRule.count = count;
    }

    onSave(finalRule);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recorrência Personalizada</DialogTitle>
          <DialogDescription>
            Defina as regras avançadas para a repetição desta missão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="interval" className="flex-shrink-0">Repetir a cada</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value, 10)))}
              className="w-20"
            />
            <Select value={freq} onValueChange={(v) => setFreq(v as RecurrenceFrequency)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">dia(s)</SelectItem>
                <SelectItem value="WEEKLY">semana(s)</SelectItem>
                <SelectItem value="MONTHLY">mês(es)</SelectItem>
                <SelectItem value="YEARLY">ano(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {freq === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>Repetir nos dias</Label>
              <ToggleGroup
                type="multiple"
                variant="outline"
                value={byDay}
                onValueChange={(value) => setByDay(value as Weekday[])}
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
            </div>
          )}

          <div className="space-y-2">
            <Label>Término</Label>
            <RadioGroup value={endCondition} onValueChange={(v) => setEndCondition(v as EndCondition)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="end-never" />
                <Label htmlFor="end-never" className="font-normal">Nunca</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on" id="end-on" />
                <Label htmlFor="end-on" className="font-normal flex-shrink-0">Em</Label>
                <Popover>
                    <PopoverTrigger asChild disabled={endCondition !== 'on'}>
                        <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground", endCondition !== 'on' && "opacity-50")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            locale={ptBR}
                            weekStartsOn={1}
                        />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after" id="end-after" />
                <Label htmlFor="end-after" className="font-normal flex-shrink-0">Após</Label>
                <Input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  className="w-20"
                  disabled={endCondition !== 'after'}
                />
                <span className={cn("text-sm", endCondition !== 'after' && "text-muted-foreground")}>
                  ocorrências
                </span>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
