
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, X } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import Loading from './loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function AgendaPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayFilter, setDayFilter] = useState<'all' | 'weekdays' | 'weekends'>('all');

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
        } finally {
            setIsLoading(false);
        }
    };
    fetchAgendaData();
  }, [user, currentContext]);

  const categoryDetailsMap = useMemo(() => new Map(missionCategories.map(cat => [cat.id, cat])), []);

  const events = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const recurringEvents = generateRecurringEvents(missionTemplates, monthStart, monthEnd);

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
    
    let allEvents = [...recurringEvents, ...instanceEvents];

    if (selectedChildId !== 'all') {
      allEvents = allEvents.filter(event => {
        if (event.type === 'instance') return (event.data as MissionInstance).childId === selectedChildId;
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

  const missionCountsByChild = useMemo(() => {
    const counts: Record<string, number> = {};
    children.forEach(c => counts[c.id] = 0);
    missionInstances.forEach(instance => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const instanceDate = (instance.dueDate || instance.assignedAt).toDate();
        if (instance.childId && counts[instance.childId] !== undefined && instanceDate >= monthStart && instanceDate <= monthEnd) {
            counts[instance.childId]++;
        }
    });
    return counts;
  }, [missionInstances, children, currentMonth]);

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  const groupedEventsForDialog = useMemo(() => {
    if (!eventsForSelectedDate.length) return { instancesByChild: new Map(), templates: [] };
    const instancesByChild = new Map<string, MissionInstance[]>();
    const templates: MissionTemplate[] = [];
    eventsForSelectedDate.forEach(event => {
      if (event.type === 'instance') {
        const instance = event.data as MissionInstance;
        if (!instancesByChild.has(instance.childId)) {
            instancesByChild.set(instance.childId, []);
        }
        instancesByChild.get(instance.childId)!.push(instance);
      } else {
        templates.push(event.data as MissionTemplate);
      }
    });
    return { instancesByChild, templates };
  }, [eventsForSelectedDate]);


  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'MH';

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    
    return (
        <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden shadow-sm">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dayName => (
                <div key={dayName} className="text-center font-semibold text-sm text-muted-foreground p-2 border-b border-r bg-muted/50">
                    <span className="hidden md:inline">{dayName}</span>
                    <span className="md:hidden">{dayName.substring(0,3)}</span>
                </div>
            ))}
            {days.map((d, i) => {
                const dayEvents = eventsByDate[format(d, 'yyyy-MM-dd')] || [];
                const dayOfWeek = getDay(d);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                let isDisabledByFilter = false;
                if (dayFilter === 'weekdays' && isWeekend) isDisabledByFilter = true;
                if (dayFilter === 'weekends' && !isWeekend) isDisabledByFilter = true;

                return (
                    <button 
                        key={i} 
                        onClick={() => setSelectedDate(d)}
                        disabled={dayEvents.length === 0 || isDisabledByFilter}
                        className={cn(
                            "h-28 md:h-36 border-b border-r p-1.5 flex flex-col relative text-left",
                            !isSameMonth(d, currentMonth) && "bg-muted/30 text-muted-foreground opacity-50",
                            dayEvents.length > 0 && "cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary z-10",
                            isDisabledByFilter && "opacity-30 pointer-events-none"
                        )}
                    >
                        <span className={cn("font-semibold text-sm w-7 h-7 flex items-center justify-center rounded-full", isToday(d) && "bg-primary text-primary-foreground")}>
                            {format(d, 'd')}
                        </span>
                        <div className="mt-1 overflow-y-auto space-y-1 text-xs">
                            {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                <div key={eventIndex} className="p-1 rounded-sm flex items-center gap-1.5" style={{ backgroundColor: `${event.color}20` }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: event.color }}></div>
                                    <p className="truncate" style={{ color: event.color }}>{event.title}</p>
                                </div>
                            ))}
                            {dayEvents.length > 3 && (
                                <p className="text-center text-muted-foreground font-medium mt-1">
                                    + {dayEvents.length - 3} mais
                                </p>
                            )}
                        </div>
                    </button>
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
        <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="w-full max-w-xs">
                <Label className="text-sm font-medium">Filtrar por Herói</Label>
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por Herói..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                             <div className="flex items-center gap-2">
                                <Users className="h-6 w-6" />
                                <div>
                                    <p>Todos os Heróis</p>
                                    <p className="text-xs text-muted-foreground">{missionInstances.length} missões no total</p>
                                </div>
                            </div>
                        </SelectItem>
                        {children.map(child => (
                            <SelectItem key={child.id} value={child.id}>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p>{child.name}</p>
                                        <p className="text-xs text-muted-foreground">{missionCountsByChild[child.id] || 0} missões</p>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar Dias</Label>
                 <RadioGroup value={dayFilter} onValueChange={(v) => setDayFilter(v as any)} className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="filter-all"/>
                    <Label htmlFor="filter-all" className="font-normal cursor-pointer">Todos</Label>
                    <RadioGroupItem value="weekdays" id="filter-weekdays"/>
                    <Label htmlFor="filter-weekdays" className="font-normal cursor-pointer">Dias de Semana</Label>
                    <RadioGroupItem value="weekends" id="filter-weekends"/>
                    <Label htmlFor="filter-weekends" className="font-normal cursor-pointer">Fins de Semana</Label>
                </RadioGroup>
            </div>
        </CardContent>
      </Card>
      
      {renderCalendar()}

      <Dialog open={!!selectedDate} onOpenChange={(isOpen) => !isOpen && setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-2xl">
                    Missões para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ''}
                </DialogTitle>
                <DialogDescription>
                    Resumo de todas as atividades programadas para este dia.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-1 space-y-4">
               {groupedEventsForDialog.instancesByChild.size === 0 && groupedEventsForDialog.templates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nenhuma missão para este dia.</p>
               ) : (
                <>
                 {Array.from(groupedEventsForDialog.instancesByChild.entries()).map(([childId, instances]) => {
                     const child = childrenMap.get(childId);
                     if (!child) return null;
                     return (
                         <div key={childId}>
                             <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
                                 </Avatar>
                                 <h3 className="font-semibold">{child.name}</h3>
                             </div>
                             <ul className="space-y-2 pl-4">
                                {instances.map(instance => {
                                    const details = categoryDetailsMap.get(instance.category);
                                    return (
                                        <li key={instance.id} className="p-2 rounded-md flex items-center gap-2" style={{ backgroundColor: `${details?.color}20` }}>
                                             <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: details?.color }}></div>
                                             <span style={{ color: details?.color }}>{instance.title}</span>
                                        </li>
                                    )
                                })}
                             </ul>
                         </div>
                     )
                 })}
                 
                 {groupedEventsForDialog.instancesByChild.size > 0 && groupedEventsForDialog.templates.length > 0 && <Separator className="my-4"/>}

                 {groupedEventsForDialog.templates.length > 0 && (
                     <div>
                        <h3 className="font-semibold mb-2 text-muted-foreground">Do Catálogo (Recorrentes)</h3>
                        <ul className="space-y-2">
                             {groupedEventsForDialog.templates.map(template => {
                                const details = categoryDetailsMap.get(template.category);
                                return (
                                    <li key={template.id} className="p-2 rounded-md flex items-center gap-2" style={{ backgroundColor: `${details?.color}20` }}>
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: details?.color }}></div>
                                        <span className="truncate" style={{ color: details?.color }}>{template.title}</span>
                                    </li>
                                )
                            })}
                        </ul>
                     </div>
                 )}
                </>
               )}
            </div>
            <DialogClose asChild>
                <Button variant="outline" className="mt-4 w-full">Fechar</Button>
            </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}

