
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

export function TimePicker({ value, onChange, className, minHour = 0, maxHour = 23, minuteStep = 1 }: TimePickerProps) {
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
    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => (minHour + i).toString().padStart(2, '0'));
  }, [minHour, maxHour]);

  const minuteOptions = React.useMemo(() => {
    return Array.from({ length: 60 / minuteStep }, (_, i) => (i * minuteStep).toString().padStart(2, '0'));
  }, [minuteStep]);


  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-full h-10">
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
