"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import React from 'react';

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 24 }).map((_, i) => {
            const h = i.toString().padStart(2, '0');
            return <SelectItem key={h} value={h}>{h}</SelectItem>;
          })}
        </SelectContent>
      </Select>
      <span className="font-semibold">:</span>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Min." />
        </SelectTrigger>
        <SelectContent>
          {['00', '15', '30', '45'].map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
