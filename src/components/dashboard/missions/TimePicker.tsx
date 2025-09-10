
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import React from 'react';

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  minHour?: number;
  maxHour?: number;
  minuteStep?: number;
}

export function TimePicker({ value, onChange, className, minHour, maxHour, minuteStep = 5 }: TimePickerProps) {
  const { hour, minute } = React.useMemo(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      return { hour: h, minute: m };
    }
    return { hour: undefined, minute: undefined };
  }, [value]);

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour || '00'}:${newMinute}`);
  };

  const hourOptions = React.useMemo(() => {
    const start = minHour ?? 0;
    const end = maxHour ?? 23;
    return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString().padStart(2, '0'));
  }, [minHour, maxHour]);

  const minuteOptions = React.useMemo(() => {
    return Array.from({ length: 60 / minuteStep }, (_, i) => (i * minuteStep).toString().padStart(2, '0'));
  }, [minuteStep]);


  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-full h-10 px-2 justify-center">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="font-semibold text-muted-foreground">:</span>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-full h-10 px-2 justify-center">
          <SelectValue placeholder="Min." />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
