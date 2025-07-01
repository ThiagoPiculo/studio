
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, addDays, subDays, eachDayOfInterval, startOfDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, ListOrdered, User, X, PlusCircle, MoreHorizontal, CheckCircle, Edit, Undo2, Sun, CloudSun, Moon } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getMissionTemplateById, completeMissionInstance, reactivateMissionInstance } from '@/lib/firebase/firestore';
import { isMissionScheduledForDate, isMissionCompletedForDate } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance, MissionTemplate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
import { AssignMissionDialog, type EditRecurrenceMode } from '@/components/dashboard/missions/AssignMissionDialog';
import { SelectMissionTemplateDialog } from '@/components/dashboard/missions/SelectMissionTemplateDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { EditRecurrenceDialog } from '@/components/dashboard/missions/EditRecurrenceDialog';


type DateRangeFilter = 'day' | '3days' | 'week' | 'month';
type SortByType = 'child' | 'missionName';
type TimePeriod = 'all' | 'morning' | 'afternoon' | 'night';

interface CalendarEvent {
  date: Date;
  title: string;
  data: MissionInstance;
}

const getPeriodForDate = (date: Date): Exclude<TimePeriod, 'all'> => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
};

export default function AgendaPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('week');
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriod>('all');
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortByType>('child');
  const [allChildrenSelected, setAllChildrenSelected] = useState(true);

  // States for the add/edit mission flow
  const [isSelectMissionDialogOpen, setIsSelectMissionDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  
  const [instanceToEdit, setInstanceToEdit] = useState<MissionInstance | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState<Date | null>(null);
  const [editMode, setEditMode] = useState<EditRecurrenceMode>('all');
  const [isEditRecurrenceDialogOpen, setIsEditRecurrenceDialogOpen] = useState(false);
  
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const fetchAgendaData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    setIsLoading(true);
    try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

        const [fetchedChildren, fetchedInstances] = await Promise.all([
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, familyIdToQuery)
        ]);
        
        setChildren(fetchedChildren);
        setMissionInstances(fetchedInstances);
        if (Object.keys(selectedChildrenIds).length === 0) {
            const initialSelection: Record<string, boolean> = {};
            fetchedChildren.forEach(c => initialSelection[c.id] = true);
            setSelectedChildrenIds(initialSelection);
        }

    } catch (error) {
        console.error("Error fetching agenda data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user, currentContext, selectedChildrenIds]);

  useEffect(() => {
    fetchAgendaData();
  }, [fetchAgendaData]);
  
  const handleMissionSelected = (template: MissionTemplate) => {
    setTemplateToAssign(template);
    setInstanceToEdit(null);
    setEditMode('all');
    setIsAssignDialogOpen(true);
  };

  const handleEditClick = async (instance: MissionInstance, date: Date) => {
      setActivePopover(null);
      if (instance.isRecurring) {
          setInstanceToEdit(instance);
          setOccurrenceDate(date);
          setIsEditRecurrenceDialogOpen(true);
      } else {
          // For non-recurring missions, we just edit this single instance.
          setInstanceToEdit(instance);
          setOccurrenceDate(date);
          setEditMode('single'); // Or 'all', as it's the only one
          setIsAssignDialogOpen(true);
      }
  };

  const handleRecurrenceEditSelect = (mode: EditRecurrenceMode) => {
      setEditMode(mode);
      setIsEditRecurrenceDialogOpen(false);
      setIsAssignDialogOpen(true);
  };

  const handleAssignmentComplete = () => {
    fetchAgendaData(); // Refetch data after assignment/edit
  };

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const viewInterval = useMemo(() => {
    const weekStartsOn = 1; // Monday
    let start, end;
    switch (dateRangeFilter) {
      case 'day':
        start = startOfDay(currentDate);
        end = startOfDay(currentDate);
        break;
      case '3days':
        start = startOfDay(currentDate);
        end = startOfDay(addDays(currentDate, 2));
        break;
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn });
        end = endOfWeek(currentDate, { weekStartsOn });
        break;
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        start = startOfWeek(monthStart, { weekStartsOn }); 
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn });
        break;
      }
    }
    return { start, end };
  }, [currentDate, dateRangeFilter]);

  const eventsByDate = useMemo(() => {
    const activeChildFilters = Object.entries(selectedChildrenIds).filter(([,v]) => v).map(([k]) => k);
    
    const instancesToProcess = allChildrenSelected 
      ? missionInstances 
      : missionInstances.filter(inst => activeChildFilters.includes(inst.childId));

    const acc: Record<string, { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }> = {};
    const daysInView = eachDayOfInterval(viewInterval);
    
    daysInView.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        acc[dateKey] = { morning: [], afternoon: [], night: [] };
    });

    instancesToProcess.forEach(instance => {
      const eventTimeSource = instance.startDate?.toDate() || instance.dueDate?.toDate();
      if (!eventTimeSource) return;

      const period = getPeriodForDate(eventTimeSource);
      
      if (timePeriodFilter !== 'all' && period !== timePeriodFilter) {
        return;
      }
      
      daysInView.forEach(day => {
        if (isMissionScheduledForDate(instance, day)) {
          const dateKey = format(day, 'yyyy-MM-dd');
          
          const event: CalendarEvent = {
            date: day,
            title: instance.title,
            data: instance,
          };
          
          acc[dateKey][period].push(event);
        }
      });
    });

    return acc;
  }, [viewInterval, missionInstances, selectedChildrenIds, allChildrenSelected, timePeriodFilter]);

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
  
  const handleCompleteMission = async (missionInstance: MissionInstance, date: Date) => {
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        await completeMissionInstance(missionInstance.id, date);
        toast({ title: 'Missão Cumprida!', description: `"${missionInstance.title}" foi concluída.` });
        fetchAgendaData();
    } catch (error) {
        console.error("Error completing mission:", error);
        toast({ title: 'Erro ao concluir', variant: 'destructive' });
    } finally {
        setIsProcessingAction(null);
    }
  };

  const handleUndoCompletion = async (missionInstance: MissionInstance, date: Date) => {
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        await reactivateMissionInstance(missionInstance.id, date);
        toast({ title: 'Ação Desfeita!', description: `A conclusão de "${missionInstance.title}" foi revertida.` });
        fetchAgendaData();
    } catch (error: any) {
        console.error("Error undoing completion:", error);
        toast({ title: 'Erro ao desfazer', description: error.message, variant: 'destructive' });
    } finally {
        setIsProcessingAction(null);
    }
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
  
  const hasAnyEvents = Object.values(eventsByDate).some(day => {
    const events = day as { morning: any[], afternoon: any[], night: any[] };
    if (!events) return false;
    return events.morning.length > 0 || events.afternoon.length > 0 || events.night.length > 0;
  });

  const renderEventListForPeriod = (events: CalendarEvent[], day: Date) => {
      if (dateRangeFilter === 'day' || dateRangeFilter === '3days') {
        const eventsByChild = events.reduce((acc, event) => {
            const childId = event.data.childId;
            if (!acc[childId]) acc[childId] = [];
            acc[childId].push(event);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);

        const sortedChildIds = Object.keys(eventsByChild).sort((a, b) => {
            const childA = childrenMap.get(a)?.name || '';
            const childB = childrenMap.get(b)?.name || '';
            return childA.localeCompare(childB);
        });

        return (
          <ul className="space-y-4">
            {sortedChildIds.map(childId => {
              const child = childrenMap.get(childId);
              if (!child) return null;
              const childEvents = eventsByChild[childId].sort((a,b) => a.title.localeCompare(b.title));

              return (
                <li key={childId} className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-offset-background ring-[var(--ring-color)]" style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}>
                        <AvatarImage src={child.avatar} alt={child.name} />
                        <AvatarFallback style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow pt-0.5">
                        <p className="font-semibold text-sm leading-tight">{child.name}</p>
                        <ul className="mt-1 space-y-1">
                            {childEvents.map(event => {
                                const popoverId = `${event.data.id}-${format(day, 'yyyy-MM-dd')}`;
                                const isCompleted = isMissionCompletedForDate(event.data, day);
                                return(
                                <li key={event.data.id} className="text-sm text-muted-foreground leading-snug">
                                    <Popover open={activePopover === popoverId} onOpenChange={(isOpen) => setActivePopover(isOpen ? popoverId : null)}>
                                      <PopoverTrigger asChild>
                                          <button disabled={isProcessingAction === event.data.id} className={cn("text-left hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-wait", isCompleted && "line-through text-muted-foreground/70")}>
                                              {isProcessingAction === event.data.id ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> : isCompleted && <CheckCircle className="h-4 w-4 inline-block mr-2 text-green-500" />}
                                              {event.title}
                                          </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-2">
                                          <div className="flex flex-col gap-1">
                                            {isCompleted ? (
                                              <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)}><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                            ) : (
                                              <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)}><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                          </div>
                                      </PopoverContent>
                                  </Popover>
                                </li>
                                )
                            })}
                        </ul>
                    </div>
                </li>
              );
            })}
          </ul>
        );
      } else { // This is for 'week' view
        const sortedEvents = [...events].sort((a, b) => {
            if (sortBy === 'child') {
                const childA = childrenMap.get(a.data.childId)?.name || '';
                const childB = childrenMap.get(b.data.childId)?.name || '';
                const nameComparison = childA.localeCompare(childB);
                if (nameComparison !== 0) return nameComparison;
            }
            return a.title.localeCompare(b.title);
        });
        return (
          <ul className="space-y-2">
            {sortedEvents.map(event => {
              const child = childrenMap.get(event.data.childId);
              if (!child) return null;
              const popoverId = `${event.data.id}-${format(day, 'yyyy-MM-dd')}`;
              const isCompleted = isMissionCompletedForDate(event.data, day);
              return (
                  <li key={event.data.id} className="text-sm flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: child.color }}></div>
                      <Popover open={activePopover === popoverId} onOpenChange={(isOpen) => setActivePopover(isOpen ? popoverId : null)}>
                          <PopoverTrigger asChild>
                              <button disabled={isProcessingAction === event.data.id} className={cn("text-left text-foreground leading-snug hover:text-primary disabled:opacity-50 disabled:cursor-wait", isCompleted && "line-through text-muted-foreground/70")}>
                                  {isProcessingAction === event.data.id ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" /> : isCompleted && <CheckCircle className="h-3 w-3 inline-block mr-1 text-green-500" />}
                                  {event.title}
                              </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                              <div className="flex flex-col gap-1">
                                {isCompleted ? (
                                  <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)}><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)}><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                              </div>
                          </PopoverContent>
                      </Popover>
                  </li>
              );
            })}
          </ul>
        );
      }
  };
  
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
          const dayEvents = (eventsByDate[dateKey] as { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { morning: [], afternoon: [], night: [] };
          const hasEventsForDay = dayEvents.morning.length > 0 || dayEvents.afternoon.length > 0 || dayEvents.night.length > 0;
  
          return (
            <div key={dateKey} className="flex flex-col space-y-2">
              <h2 className={cn("text-lg font-headline capitalize flex items-center gap-2", isToday(day) && "text-primary")}>
                {format(day, "EEEE, dd", { locale: ptBR })}
                {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
              </h2>
              
              <div className="flex-1">
                {!hasEventsForDay ? (
                    <Card className="shadow-sm h-full">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                            Nenhuma missão.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-sm h-full">
                      <CardContent className="p-4 space-y-4">
                        {dayEvents.morning.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-base font-semibold text-muted-foreground"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>
                            {renderEventListForPeriod(dayEvents.morning, day)}
                          </div>
                        )}
                        {dayEvents.afternoon.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-base font-semibold text-muted-foreground"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>
                            {renderEventListForPeriod(dayEvents.afternoon, day)}
                          </div>
                        )}
                        {dayEvents.night.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-base font-semibold text-muted-foreground"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>
                            {renderEventListForPeriod(dayEvents.night, day)}
                          </div>
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
    const { start: startDate, end: endDate } = viewInterval;
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
              const dayEventsByPeriod = (eventsByDate[dateKey] as { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { morning: [], afternoon: [], night: [] };
              const dayEvents = [...dayEventsByPeriod.morning, ...dayEventsByPeriod.afternoon, ...dayEventsByPeriod.night];
              
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
                        const popoverId = `${event.data.id}-${dateKey}`;
                        const isCompleted = isMissionCompletedForDate(event.data, day);
                        return (
                          <li key={event.data.id} className="text-xs flex items-start gap-1.5">
                              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                              <Popover open={activePopover === popoverId} onOpenChange={(isOpen) => setActivePopover(isOpen ? popoverId : null)}>
                                  <PopoverTrigger asChild>
                                      <button disabled={isProcessingAction === event.data.id} className={cn("text-left leading-tight hover:text-primary disabled:opacity-50 disabled:cursor-wait", isCompleted && "line-through text-muted-foreground/70")}>
                                          {isProcessingAction === event.data.id ? <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" /> : isCompleted && <CheckCircle className="h-3 w-3 inline-block mr-1 text-green-500" />}
                                          {event.title}
                                      </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2">
                                      <div className="flex flex-col gap-1">
                                          {isCompleted ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)}><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                          ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)}><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                          )}
                                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)}><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                      </div>
                                  </PopoverContent>
                              </Popover>
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
    <>
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
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Período anterior">
                          <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h2 className="text-xl font-semibold text-center w-auto min-w-48 capitalize">
                        {formatHeaderDate(currentDate, dateRangeFilter, viewInterval)}
                      </h2>
                      <Button variant="outline" size="icon" onClick={handleNext} aria-label="Próximo período">
                          <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setIsSelectMissionDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Missão
                      </Button>
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
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Ver Período</Label>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <ToggleGroup type="single" value={dateRangeFilter} onValueChange={(v) => v && setDateRangeFilter(v as DateRangeFilter)} className="justify-start">
                          <ToggleGroupItem value="day" aria-label="Ver dia">Dia</ToggleGroupItem>
                          <ToggleGroupItem value="3days" aria-label="Ver 3 dias">3 Dias</ToggleGroupItem>
                          <ToggleGroupItem value="week" aria-label="Ver semana">Semana</ToggleGroupItem>
                          <ToggleGroupItem value="month" aria-label="Ver mês">Mês</ToggleGroupItem>
                      </ToggleGroup>
                      <Button variant="outline" onClick={handleToday}>Hoje</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Filtrar Período do Dia</Label>
                    <ToggleGroup type="single" value={timePeriodFilter} onValueChange={(v) => v && setTimePeriodFilter(v as TimePeriod)} className="justify-start mt-1">
                        <ToggleGroupItem value="all" aria-label="Ver todos">Todos</ToggleGroupItem>
                        <ToggleGroupItem value="morning" aria-label="Ver manhã" className="gap-1.5"><Sun className="h-4 w-4" />Manhã</ToggleGroupItem>
                        <ToggleGroupItem value="afternoon" aria-label="Ver tarde" className="gap-1.5"><CloudSun className="h-4 w-4" />Tarde</ToggleGroupItem>
                        <ToggleGroupItem value="night" aria-label="Ver noite" className="gap-1.5"><Moon className="h-4 w-4" />Noite</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="sm:col-span-2">
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

      <SelectMissionTemplateDialog
        isOpen={isSelectMissionDialogOpen}
        onOpenChange={setIsSelectMissionDialogOpen}
        onMissionSelected={handleMissionSelected}
      />
      
      <AssignMissionDialog
        template={templateToAssign}
        instanceToEdit={instanceToEdit}
        occurrenceDate={occurrenceDate}
        editMode={editMode}
        isOpen={isAssignDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTemplateToAssign(null);
            setInstanceToEdit(null);
            setOccurrenceDate(null);
          }
          setIsAssignDialogOpen(isOpen);
        }}
        onAssigned={handleAssignmentComplete}
      />
      
      <EditRecurrenceDialog
        isOpen={isEditRecurrenceDialogOpen}
        onOpenChange={setIsEditRecurrenceDialogOpen}
        onSelect={handleRecurrenceEditSelect}
        missionInstance={instanceToEdit}
        occurrenceDate={occurrenceDate}
      />
    </>
  );
}
