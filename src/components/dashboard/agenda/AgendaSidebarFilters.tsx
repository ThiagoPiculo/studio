
"use client";

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Sun, CloudSun, Moon } from 'lucide-react';
import type { DateRangeFilter, TimePeriod } from '@/app/dashboard/agenda/page';

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
        <div className="space-y-4 group-data-[collapsible=icon]:hidden">
            <div>
                <Label className="text-sm font-semibold text-sidebar-foreground/80 px-2">Ver Período</Label>
                <ToggleGroup
                    type="single"
                    value={view}
                    onValueChange={(value) => handleFilterChange('view', value)}
                    className="flex flex-col items-start gap-1 mt-1"
                >
                    <ToggleGroupItem value="day" aria-label="Ver 1 Dia" className="w-full justify-start">1 Dia</ToggleGroupItem>
                    <ToggleGroupItem value="3days" aria-label="Ver 3 dias" className="w-full justify-start">3 Dias</ToggleGroupItem>
                    <ToggleGroupItem value="workweek" aria-label="Ver semana útil" className="w-full justify-start">Semana Útil</ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Ver semana" className="w-full justify-start">Semana</ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label="Ver mês" className="w-full justify-start">Mês</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <div>
                <Label className="text-sm font-semibold text-sidebar-foreground/80 px-2">Período do Dia</Label>
                <ToggleGroup
                    type="single"
                    value={period}
                    onValueChange={(value) => handleFilterChange('period', value)}
                    className="flex flex-col items-start gap-1 mt-1"
                >
                    <ToggleGroupItem value="all" aria-label="Ver todos" className="w-full justify-start">Todos</ToggleGroupItem>
                    <ToggleGroupItem value="morning" aria-label="Ver manhã" className="w-full justify-start gap-1.5">
                        <Sun className="h-4 w-4" />Manhã
                    </ToggleGroupItem>
                    <ToggleGroupItem value="afternoon" aria-label="Ver tarde" className="w-full justify-start gap-1.5">
                        <CloudSun className="h-4 w-4" />Tarde
                    </ToggleGroupItem>
                    <ToggleGroupItem value="night" aria-label="Ver noite" className="w-full justify-start gap-1.5">
                        <Moon className="h-4 w-4" />Noite
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );
}
