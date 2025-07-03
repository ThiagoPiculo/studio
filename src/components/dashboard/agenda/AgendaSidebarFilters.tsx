
"use client";

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Sun, CloudSun, Moon } from 'lucide-react';
import type { DateRangeFilter, TimePeriod } from '@/app/dashboard/agenda/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export function AgendaSidebarFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const view = (searchParams.get('view') || '3days') as DateRangeFilter;
    const period = (searchParams.get('period') || 'all') as TimePeriod;

    const handleFilterChange = (type: 'view' | 'period', value: string | null) => {
        if (!value) return;
        
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        current.set(type, value);
        
        const search = current.toString();
        const query = search ? `?${search}` : "";

        router.replace(`${pathname}${query}`);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-xs font-semibold text-sidebar-foreground/70 px-2">Ver Período</Label>
                <Select value={view} onValueChange={(value) => handleFilterChange('view', value)}>
                    <SelectTrigger className="w-full mt-1 bg-sidebar-accent border-sidebar-border h-9">
                        <SelectValue placeholder="Selecione a visão" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">1 Dia</SelectItem>
                        <SelectItem value="3days">3 Dias</SelectItem>
                        <SelectItem value="workweek">Semana Útil</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label className="text-xs font-semibold text-sidebar-foreground/70 px-2">Período do Dia</Label>
                <Select value={period} onValueChange={(value) => handleFilterChange('period', value)}>
                    <SelectTrigger className="w-full mt-1 bg-sidebar-accent border-sidebar-border h-9">
                        <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="morning">
                            <span className="flex items-center gap-2"><Sun className="h-4 w-4" />Manhã</span>
                        </SelectItem>
                        <SelectItem value="afternoon">
                            <span className="flex items-center gap-2"><CloudSun className="h-4 w-4" />Tarde</span>
                        </SelectItem>
                        <SelectItem value="night">
                             <span className="flex items-center gap-2"><Moon className="h-4 w-4" />Noite</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
