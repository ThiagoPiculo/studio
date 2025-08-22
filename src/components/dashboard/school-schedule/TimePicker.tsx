
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
}

const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export function TimePicker({ value, onChange, className, minHour, maxHour }: TimePickerProps) {
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-full justify-center px-1">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="font-semibold">:</span>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-full justify-center px-1">
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
