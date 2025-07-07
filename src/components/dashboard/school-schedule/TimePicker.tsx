
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hour, setHour] = useState<string>('00');
  const [minute, setMinute] = useState<string>('00');

  useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      if (h && m) {
        setHour(h);
        setMinute(m);
      }
    } else {
        setHour('00');
        setMinute('00');
    }
  }, [value]);

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    onChange(`${hour}:${newMinute}`);
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
          <SelectValue placeholder="Minuto" />
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
