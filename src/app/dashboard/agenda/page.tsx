
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, addDays, subDays, eachDayOfInterval, startOfDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, ListOrdered, User, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { isMissionScheduledForDate } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Loading from './loading';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


type DateRangeFilter = 'day' | '3days' | 'week' | 'month';
type SortByType = 'child' | 'missionName';

interface CalendarEvent {
  date: Date;
  title: string;
  data: MissionInstance;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);

  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('week');
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortByType>('child');
  const [allChildrenSelected, setAllChildrenSelected] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    const fetchAgendaData = async () => {
        setIsLoading(true);
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

            const [fetchedChildren, fetchedInstances] = await Promise.all([
                getChildProfilesForAttribution(user.uid, currentContext),
                getMissionInstancesForContext(user.uid, familyIdToQuery)
            ]);
            
            setChildren(fetchedChildren);
            setMissionInstances(fetchedInstances);
            const initialSelection: Record<string, boolean> = {};
            fetchedChildren.forEach(c => initialSelection[c.id] = true);
            setSelectedChildrenIds(initialSelection);

        } catch (error) {
            console.error("Error fetching agenda data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchAgendaData();
  }, [user, currentContext]);
  
  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const viewInterval = useMemo(() => {
    const weekStartsOn = 1; // Monday
    switch (dateRangeFilter) {
      case 'day':
        return { start: startOfDay(currentDate), end: startOfDay(currentDate) };
      case '3days':
        return { start: startOfDay(currentDate), end: startOfDay(addDays(currentDate, 2)) };
      case 'week':
        return { start: startOfWeek(currentDate, { weekStartsOn }), end: endOfWeek(currentDate, { weekStartsOn }) };
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, dateRangeFilter]);

  const events = useMemo(() => {
    const activeChildFilters = Object.entries(selectedChildrenIds).filter(([,v]) => v).map(([k]) => k);
    
    const instancesToProcess = allChildrenSelected 
      ? missionInstances 
      : missionInstances.filter(inst => activeChildFilters.includes(inst.childId));

    const { start, end } = viewInterval;
    const allEvents: CalendarEvent[] = [];
    const daysInView = eachDayOfInterval({ start, end });

    instancesToProcess.forEach(instance => {
      daysInView.forEach(day => {
        if (isMissionScheduledForDate(instance, day)) {
          allEvents.push({
            date: day,
            title: instance.title,
            data: instance,
          });
        }
      });
    });
    return allEvents;
  }, [viewInterval, missionInstances, selectedChildrenIds, allChildrenSelected]);

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

  const handlePrev = () => {
    const dateChanges = { day: 1, '3days': 3, week: 7, month: 0 };
    if (dateRangeFilter === 'month') {
        setCurrentDate(subMonths(currentDate, 1));
    } else {
        setCurrentDate(subDays(currentDate, dateChanges[dateRangeFilter]));
    }
  };

  const handleNext = () => {
    const dateChanges = { day: 1, '3days': 3, week: 7, month: 0 };
    if (dateRangeFilter === 'month') {
        setCurrentDate(addMonths(currentDate, 1));
    } else {
        setCurrentDate(addDays(currentDate, dateChanges[dateRangeFilter]));
    }
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatHeaderDate = (date: Date, range: DateRangeFilter, interval: {start: Date, end: Date}) => {
    if (range === 'day') return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    if (range === 'month') return format(date, 'MMMM yyyy', { locale: ptBR });
    
    const start = interval.start;
    const end = interval.end;

    const startMonth = format(start, 'MMMM', { locale: ptBR });
    const endMonth = format(end, 'MMMM', { locale: ptBR });

    if (startMonth === endMonth) {
        return `${format(start, 'd')} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    } else {
        return `${format(start, "d 'de' MMMM", { locale: ptBR })} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    }
  };
  
  const handleChildSelectionChange = useCallback((childId: string, isSelected: boolean) => {
    setSelectedChildrenIds(prev => {
        const newSelection = { ...prev, [childId]: isSelected };
        const allSelected = children.every(c => newSelection[c.id]);
        setAllChildrenSelected(allSelected);
        return newSelection;
    });
  }, [children]);

  const handleSelectAllChange = useCallback((isSelected: boolean) => {
    setAllChildrenSelected(isSelected);
    const newSelection: Record<string, boolean> = {};
    children.forEach(c => newSelection[c.id] = isSelected);
    setSelectedChildrenIds(newSelection);
  }, [children]);

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'MH';
  
  const hasAnyEvents = Object.keys(eventsByDate).length > 0;
  
  const renderGridView = () => {
    const days = eachDayOfInterval(viewInterval);
  
    if (!hasAnyEvents && dateRangeFilter !== 'month') {
      return (
        <Card className="text-center py-10 shadow-sm">
          <CardContent>
            <CalendarIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhuma missão agendada neste período.</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou atribua novas missões.</p>
          </CardContent>
        </Card>
      );
    }
    
    const gridClasses = {
        day: 'grid-cols-1',
        '3days': 'grid-cols-1 lg:grid-cols-3',
        week: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
    };
  
    return (
      <div className={cn("grid gap-6", gridClasses[dateRangeFilter])}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
  
          const groupedByChild = dayEvents.reduce((acc, event) => {
            const childId = event.data.childId;
            if (!acc[childId]) acc[childId] = [];
            acc[childId].push(event.data);
            return acc;
          }, {} as Record<string, MissionInstance[]>);
  
          const sortedByName = [...dayEvents].sort((a, b) => a.title.localeCompare(b.title));
  
          return (
            <div key={dateKey} className="flex flex-col space-y-2">
              <h2 className={cn("text-lg font-headline capitalize flex items-center gap-2", isToday(day) && "text-primary")}>
                {format(day, "EEEE, dd", { locale: ptBR })}
                {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
              </h2>
              
              <div className="flex-1">
                {dayEvents.length === 0 ? (
                    <Card className="shadow-sm h-full">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                            Nenhuma missão.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-sm h-full">
                        <CardContent className="p-4 space-y-4">
                        {sortBy === 'child' ? (
                            Object.entries(groupedByChild).map(([childId, missions]) => {
                            const child = childrenMap.get(childId);
                            if (!child) return null;
                            return (
                                <div key={childId} className="flex items-start gap-4">
                                <Avatar className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)] mt-1" style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}>
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-md">{child.name}</h3>
                                    <ul className="mt-1 space-y-1">
                                    {missions.map(mission => (
                                        <li key={mission.id} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                                            <span>{mission.title}</span>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                                </div>
                            )
                            })
                        ) : (
                            <ul className="space-y-2">
                            {sortedByName.map(event => {
                                const child = childrenMap.get(event.data.childId);
                                if (!child) return null;
                                return (
                                <li key={event.data.id} className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 ring-1 ring-offset-background ring-[var(--ring-color)]" style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}>
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                    <p className="text-sm font-medium">{event.title}</p>
                                    <p className="text-xs text-muted-foreground">{child.name}</p>
                                    </div>
                                </li>
                                )
                            })}
                            </ul>
                        )}
                        </CardContent>
                    </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    return (
      <Card className="shadow-lg mt-6">
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-7 text-center font-bold text-muted-foreground text-sm">
            {dayHeaders.map(day => <div key={day} className="py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 border-t border-l">
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];

              const sortedEvents = [...dayEvents].sort((a, b) => {
                if (sortBy === 'child') {
                  const childA = childrenMap.get(a.data.childId)?.name || '';
                  const childB = childrenMap.get(b.data.childId)?.name || '';
                  return childA.localeCompare(childB);
                }
                return a.title.localeCompare(b.title);
              });
              
              return (
                <div key={dateKey} className={cn(
                    "h-32 md:h-40 border-r border-b p-2 flex flex-col",
                    !isSameMonth(day, currentDate) && "bg-muted/50 text-muted-foreground",
                    isToday(day) && "bg-accent/10"
                )}>
                  <div className={cn(
                      "font-semibold text-sm",
                      isToday(day) && "flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground"
                  )}>{format(day, 'd')}</div>
                  <ScrollArea className="flex-1 mt-1">
                    <ul className="space-y-1">
                      {sortedEvents.map(event => {
                        const child = childrenMap.get(event.data.childId);
                        if (!child) return null;
                        return (
                          <li key={event.data.id} className="text-xs flex items-start gap-1.5">
                              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                              <span className="leading-tight">{event.title}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (isLoading) return <Loading />;

  const renderContent = () => {
    switch(dateRangeFilter) {
      case 'month':
        return renderCalendarView();
      default:
        return renderGridView();
    }
  }

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
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Período anterior">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-semibold text-center w-auto min-w-48 capitalize">
                           {formatHeaderDate(currentDate, dateRangeFilter, viewInterval)}
                        </h2>
                        <Button variant="outline" size="icon" onClick={handleNext} aria-label="Próximo período">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handleToday}>Hoje</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator/>
           <div className="flex flex-col md:flex-row gap-6 pt-2">
            <div className="w-full md:w-auto md:max-w-xs space-y-2 md:border-r md:pr-6">
                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Filtrar por Herói</Label>
                <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox id="select-all" checked={allChildrenSelected} onCheckedChange={handleSelectAllChange} />
                    <Label htmlFor="select-all" className="font-medium">Todos os Heróis</Label>
                </div>
                <ScrollArea className="h-32">
                    <div className="space-y-2 py-1 pr-2">
                        {children.map(child => (
                            <div key={child.id} className="flex items-center space-x-3">
                                <Checkbox id={`child-filter-${child.id}`} checked={!!selectedChildrenIds[child.id]} onCheckedChange={(checked) => handleChildSelectionChange(child.id, !!checked)} />
                                <Label htmlFor={`child-filter-${child.id}`} className="font-normal flex items-center gap-2 cursor-pointer">
                                    <Avatar className="h-6 w-6 ring-1 ring-offset-background ring-[var(--ring-color)]" style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}>
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
                                    </Avatar>
                                    {child.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Ver Período</Label>
                  <ToggleGroup type="single" value={dateRangeFilter} onValueChange={(v) => v && setDateRangeFilter(v as DateRangeFilter)} className="mt-1 flex-wrap justify-start">
                      <ToggleGroupItem value="day" aria-label="Ver dia">Dia</ToggleGroupItem>
                      <ToggleGroupItem value="3days" aria-label="Ver 3 dias">3 Dias</ToggleGroupItem>
                      <ToggleGroupItem value="week" aria-label="Ver semana">Semana</ToggleGroupItem>
                      <ToggleGroupItem value="month" aria-label="Ver mês">Mês</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <Label htmlFor="sort-by" className="text-sm font-semibold text-muted-foreground">Organizar por</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByType)}>
                      <SelectTrigger id="sort-by" className="w-full sm:w-48 mt-1">
                          <SelectValue placeholder="Organizar por..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="child">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Herói</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="missionName">
                             <div className="flex items-center gap-2">
                              <ListOrdered className="h-4 w-4" />
                              <span>Missão do heroi</span>
                            </div>
                          </SelectItem>
                      </SelectContent>
                  </Select>
                </div>
            </div>
           </div>
        </CardContent>
      </Card>
      
      {renderContent()}
    </div>
  );
}

    

    

