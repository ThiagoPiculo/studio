
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getMissionTemplatesByOwnerOrFamily, getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { generateRecurringEvents } from '@/lib/calendar-utils';
import type { CalendarEvent } from '@/lib/calendar-utils';
import type { ChildProfile, MissionTemplate, MissionInstance, MissionCategoryDetails } from '@/lib/types';
import { missionCategories } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import Loading from './loading';

export default function AgendaPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('all');

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    const fetchAgendaData = async () => {
        setIsLoading(true);
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

            const [fetchedChildren, fetchedTemplates, fetchedInstances] = await Promise.all([
                getChildProfilesForAttribution(user.uid, currentContext),
                getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
                getMissionInstancesForContext(user.uid, familyIdToQuery)
            ]);
            
            setChildren(fetchedChildren);
            setMissionTemplates(fetchedTemplates.filter(t => t.recurrenceRule));
            setMissionInstances(fetchedInstances);
        } catch (error) {
            console.error("Error fetching agenda data:", error);
            // Handle toast notification here if desired
        } finally {
            setIsLoading(false);
        }
    };
    fetchAgendaData();
  }, [user, currentContext]);

  const categoryDetailsMap = useMemo(() => 
    new Map(missionCategories.map(cat => [cat.id, cat]))
  , []);

  const events = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // 1. Generate events from recurring templates
    const recurringEvents = generateRecurringEvents(missionTemplates, monthStart, monthEnd);

    // 2. Generate events from single instances
    const instanceEvents: CalendarEvent[] = missionInstances.map(instance => {
      const date = (instance.dueDate || instance.assignedAt) as Timestamp;
      return {
        date: date.toDate(),
        title: instance.title,
        color: categoryDetailsMap.get(instance.category)?.color || 'hsl(var(--foreground))',
        type: 'instance',
        data: instance,
      };
    }).filter(event => event.date >= monthStart && event.date <= monthEnd);
    
    // 3. Combine and filter
    let allEvents = [...recurringEvents, ...instanceEvents];

    if (selectedChildId !== 'all') {
      allEvents = allEvents.filter(event => {
        if (event.type === 'instance') {
          return (event.data as MissionInstance).childId === selectedChildId;
        }
        // For now, recurring templates are shown for all children.
        // A future improvement would be to have recurring assignments.
        return true; 
      });
    }

    return allEvents;
  }, [currentMonth, missionTemplates, missionInstances, selectedChildId, categoryDetailsMap]);

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [events]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addMonths(day, 0); // Date object clone
      day.setDate(day.getDate() + 1);
    }
    
    const getDayEvents = (d: Date) => {
        const dateKey = format(d, 'yyyy-MM-dd');
        return eventsByDate[dateKey] || [];
    };

    return (
        <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden shadow-sm">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dayName => (
                <div key={dayName} className="text-center font-semibold text-sm text-muted-foreground p-2 border-b border-r bg-muted/50">
                    <span className="hidden md:inline">{dayName}</span>
                    <span className="md:hidden">{dayName.substring(0,3)}</span>
                </div>
            ))}
            {days.map((d, i) => {
                const dayEvents = getDayEvents(d);
                return (
                    <div key={i} className={cn("h-28 md:h-36 border-b border-r p-1.5 flex flex-col relative", !isSameMonth(d, currentMonth) && "bg-muted/30 text-muted-foreground opacity-50")}>
                        <span className={cn("font-semibold text-sm w-7 h-7 flex items-center justify-center rounded-full", isToday(d) && "bg-primary text-primary-foreground")}>
                            {format(d, 'd')}
                        </span>
                        <div className="mt-1 overflow-y-auto space-y-1 text-xs">
                            {dayEvents.slice(0, 3).map((event, eventIndex) => {
                                const details = categoryDetailsMap.get((event.data as MissionTemplate).category);
                                return (
                                <div key={eventIndex} className="p-1 rounded-sm flex items-center gap-1.5" style={{ backgroundColor: details?.color ? `${details.color}20` : 'transparent' }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: event.color }}></div>
                                    <p className="truncate" style={{ color: details?.color || 'inherit' }}>{event.title}</p>
                                </div>
                                )
                            })}
                            {dayEvents.length > 3 && (
                                <p className="text-center text-muted-foreground font-medium mt-1">
                                    + {dayEvents.length - 3} mais
                                </p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
  };
  
  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <Card>
         <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle className="text-3xl font-headline flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-primary" />
                        Agenda dos Heróis
                    </CardTitle>
                    <CardDescription>
                        Planeje e visualize as missões da sua equipe.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mês anterior">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold text-center w-48 capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Próximo mês">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="max-w-xs">
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Filtrar por Herói..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Heróis</SelectItem>
                        {children.map(child => (
                            <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>
      
      {renderCalendar()}
    </div>
  );
}
