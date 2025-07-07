
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, addDays, subDays, eachDayOfInterval, startOfDay, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, ListOrdered, User, X, PlusCircle, MoreHorizontal, CheckCircle, Edit, Undo2, Sun, CloudSun, Moon, Star as StarIcon, BadgeCheck, Trash2, Target, Filter } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getMissionTemplateById, completeMissionInstance, reactivateMissionInstance, excludeMissionInstanceOccurrence, updateRecurringMissionInstance, deleteMissionInstance, deleteFutureOccurrences } from '@/lib/firebase/firestore';
import { isMissionScheduledForDate, isMissionCompletedForDate } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance, MissionTemplate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Loading from './loading';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssignMissionDialog, type EditRecurrenceMode } from '@/components/dashboard/missions/AssignMissionDialog';
import { SelectMissionTemplateDialog } from '@/components/dashboard/missions/SelectMissionTemplateDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { EditRecurrenceDialog } from '@/components/dashboard/missions/EditRecurrenceDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DeleteRecurrenceDialog } from '@/components/dashboard/missions/DeleteRecurrenceDialog';


type DateRangeFilter = 'day' | '3days' | 'week' | 'workweek' | 'month';
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

function AgendaPageContent() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  const childIdParam = searchParams.get('child_id');
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>(childIdParam ? [childIdParam] : []);

  // States for the add/edit mission flow
  const [isSelectMissionDialogOpen, setIsSelectMissionDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  
  const [instanceToEdit, setInstanceToEdit] = useState<MissionInstance | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState<Date | null>(null);
  
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [highlightedMissionId, setHighlightedMissionId] = useState<string | null>(null);
  const [instanceToExclude, setInstanceToExclude] = useState<{ instance: MissionInstance; date: Date } | null>(null);

  const [instanceToDeleteInfo, setInstanceToDeleteInfo] = useState<{ instance: MissionInstance; date: Date } | null>(null);
  const [isDeleteRecurrenceDialogOpen, setIsDeleteRecurrenceDialogOpen] = useState(false);
  const [isConfirmSimpleDeleteOpen, setIsConfirmSimpleDeleteOpen] = useState(false);

  // Read filters from URL
  const dateRangeFilter = (searchParams.get('view') || '3days') as DateRangeFilter;
  const timePeriodFilter = (searchParams.get('period') || 'all') as TimePeriod;

  const handleShowTodayMissions = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('view', 'day');
    newParams.set('focus_date', format(new Date(), 'yyyy-MM-dd'));
    router.replace(`${pathname}?${newParams.toString()}`);
  };

  useEffect(() => {
    const focusDateParam = searchParams.get('focus_date');
    const openPopoverParam = searchParams.get('open_popover');
    
    if (focusDateParam) {
      const [year, month, day] = focusDateParam.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && !isSameDay(date, currentDate)) {
          setCurrentDate(date);
      }
    }

    if (openPopoverParam) {
        const timer = setTimeout(() => {
            const element = document.querySelector(`[data-mission-id="${openPopoverParam}"]`);
            setActivePopover(openPopoverParam);
            setHighlightedMissionId(openPopoverParam);

            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Clean up URL to prevent re-triggering on refresh
            const currentUrl = new URL(window.location.toString());
            currentUrl.searchParams.delete('open_popover');
            currentUrl.searchParams.delete('focus_date');
            window.history.replaceState({}, '', currentUrl.toString());

        }, 200);
        return () => clearTimeout(timer);
    }
  }, [searchParams, currentDate]);


  const refetchData = useCallback(async () => {
    if (!user) return;
    try {
      const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
      const instances = await getMissionInstancesForContext(user.uid, familyIdToQuery);
      setMissionInstances(instances);
    } catch (error) {
      console.error("Error refetching mission instances:", error);
      toast({ title: 'Erro ao atualizar missões', variant: 'destructive' });
    }
  }, [user, currentContext, toast]);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadDataForContext = async () => {
      setIsLoading(true);
      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

        const [fetchedChildren, fetchedInstances] = await Promise.all([
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, familyIdToQuery)
        ]);
        
        setChildren(fetchedChildren);
        setMissionInstances(fetchedInstances);
        // Do not reset selected children if coming from a link
        if (!childIdParam) {
          setSelectedChildrenIds([]);
        }

      } catch (error) {
        console.error("Error fetching agenda data for new context:", error);
        toast({ title: 'Erro ao carregar agenda', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    loadDataForContext();
  }, [user, currentContext, toast, childIdParam]);
  
  const handleMissionSelected = (template: MissionTemplate) => {
    setTemplateToAssign(template);
    setInstanceToEdit(null);
    setIsAssignDialogOpen(true);
  };

  const handleEditClick = (instance: MissionInstance, date: Date) => {
    setActivePopover(null);
    setInstanceToEdit(instance);
    setOccurrenceDate(date);
    setTemplateToAssign(null);
    setIsAssignDialogOpen(true);
  };

  const handleAssignmentComplete = () => {
    refetchData();
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
      case 'workweek':
        start = startOfWeek(currentDate, { weekStartsOn });
        end = addDays(start, 4); // Monday to Friday
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
    const instancesToProcess = selectedChildrenIds.length === 0 
      ? missionInstances 
      : missionInstances.filter(inst => selectedChildrenIds.includes(inst.childId));

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
  }, [viewInterval, missionInstances, selectedChildrenIds, timePeriodFilter]);

  const createUrlWithNewDate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('focus_date', format(newDate, 'yyyy-MM-dd'));
    return `${pathname}?${params.toString()}`;
  }
  
  const handleFilterChange = (type: 'view' | 'period', value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const handlePrev = () => {
    const dateChanges = { day: 1, '3days': 3, week: 7, workweek: 7, month: 0 };
    let newDate;
    if (dateRangeFilter === 'month') {
        newDate = subMonths(currentDate, 1);
    } else {
        newDate = subDays(currentDate, dateChanges[dateRangeFilter]);
    }
    router.replace(createUrlWithNewDate(newDate));
  };

  const handleNext = () => {
    const dateChanges = { day: 1, '3days': 3, week: 7, workweek: 7, month: 0 };
    let newDate;
    if (dateRangeFilter === 'month') {
        newDate = addMonths(currentDate, 1);
    } else {
        newDate = addDays(currentDate, dateChanges[dateRangeFilter]);
    }
    router.replace(createUrlWithNewDate(newDate));
  };
  
  const handleToday = () => {
    router.replace(createUrlWithNewDate(new Date()));
  };
  
  const handleCompleteMission = async (missionInstance: MissionInstance, date: Date) => {
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        const result = await completeMissionInstance(missionInstance.id, date);
        if (result) {
            toast({ title: 'Missão Cumprida!', description: `"${missionInstance.title}" foi concluída.` });
        } else {
            toast({ title: 'Ação Duplicada', description: 'Esta missão já foi concluída para esta data.', variant: 'default' });
        }
        refetchData();
    } catch (error: any) {
        console.error("Error completing mission:", error);
        toast({ title: 'Erro ao concluir', description: error.message || 'Um erro inesperado ocorreu.', variant: 'destructive' });
        refetchData();
    } finally {
        setIsProcessingAction(null);
    }
  };

  const handleUndoCompletion = async (missionInstance: MissionInstance, date: Date) => {
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        const result = await reactivateMissionInstance(missionInstance.id, date);
        if (result) {
            toast({ title: 'Ação Desfeita!', description: `A conclusão de "${missionInstance.title}" foi revertida.` });
        } else {
            toast({ title: 'Ação Inválida', description: 'Não havia uma conclusão para esta data para ser desfeita.', variant: 'default' });
        }
        refetchData();
    } catch (error: any) {
        console.error("Error undoing completion:", error);
        toast({ title: 'Erro ao desfazer', description: error.message, variant: 'destructive' });
        refetchData();
    } finally {
        setIsProcessingAction(null);
    }
  };
  
  const handleExcludeClick = (instance: MissionInstance, date: Date) => {
    setActivePopover(null);
    setInstanceToExclude({ instance, date });
  };
  
  const handleConfirmExclusion = async () => {
    if (!instanceToExclude) return;
    setIsProcessingAction(instanceToExclude.instance.id);
    try {
      await excludeMissionInstanceOccurrence(instanceToExclude.instance.id, instanceToExclude.date);
      toast({ title: 'Ocorrência Removida!', description: `A missão não aparecerá mais neste dia.` });
      refetchData();
    } catch (error) {
      console.error("Error excluding mission occurrence:", error);
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    } finally {
      setIsProcessingAction(null);
      setInstanceToExclude(null);
    }
  };

  const handleDeleteClick = (instance: MissionInstance, date: Date) => {
    setActivePopover(null);
    setInstanceToDeleteInfo({ instance, date });
    if (instance.isRecurring) {
        setIsDeleteRecurrenceDialogOpen(true);
    } else {
        setIsConfirmSimpleDeleteOpen(true);
    }
  };

  const handleConfirmRecurrenceDelete = async (mode: 'single' | 'forward' | 'all') => {
      if (!instanceToDeleteInfo) return;
      
      const { instance, date } = instanceToDeleteInfo;
      setIsProcessingAction(instance.id);
      setIsDeleteRecurrenceDialogOpen(false);

      try {
          if (mode === 'single') {
              await excludeMissionInstanceOccurrence(instance.id, date);
              toast({ title: 'Ocorrência Removida!', description: 'A missão foi removida apenas para este dia.' });
          } else if (mode === 'forward') {
              await deleteFutureOccurrences(instance.id, date);
              toast({ title: 'Ocorrências Futuras Removidas!', description: 'Esta e as futuras ocorrências da missão foram removidas.' });
          } else if (mode === 'all') {
              await deleteMissionInstance(instance.id);
              toast({ title: 'Série de Missões Removida!', description: 'Toda a série de missões recorrentes foi removida.' });
          }
          await refetchData();
      } catch (error: any) {
          console.error("Error deleting recurring mission:", error);
          toast({ title: 'Erro ao Excluir', description: error.message, variant: 'destructive' });
      } finally {
          setIsProcessingAction(null);
          setInstanceToDeleteInfo(null);
      }
  };

  const handleConfirmSimpleDelete = async () => {
      if (!instanceToDeleteInfo) return;
      const { instance } = instanceToDeleteInfo;
      setIsProcessingAction(instance.id);
      setIsConfirmSimpleDeleteOpen(false);

      try {
          await deleteMissionInstance(instance.id);
          toast({ title: 'Missão Removida!', description: 'A missão foi removida da agenda.' });
          await refetchData();
      } catch (error: any) {
          console.error("Error deleting simple mission:", error);
          toast({ title: 'Erro ao Excluir', description: error.message, variant: 'destructive' });
      } finally {
          setIsProcessingAction(null);
          setInstanceToDeleteInfo(null);
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

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'MH';
  
  const hasAnyEvents = Object.values(eventsByDate).some(day => {
    const events = day as { morning: any[], afternoon: any[], night: any[] };
    if (!events) return false;
    return events.morning.length > 0 || events.afternoon.length > 0 || events.night.length > 0;
  });

  const renderEventListForPeriod = (events: CalendarEvent[], day: Date) => {
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
      <ul className="space-y-6">
        {sortedChildIds.map(childId => {
          const child = childrenMap.get(childId);
          if (!child) return null;
          const childEvents = eventsByChild[childId].sort((a, b) => {
              const timeA = a.data.startDate?.toDate() || a.data.dueDate?.toDate();
              const timeB = b.data.startDate?.toDate() || b.data.dueDate?.toDate();
              
              const minutesA = timeA ? timeA.getHours() * 60 + timeA.getMinutes() : Number.MAX_SAFE_INTEGER;
              const minutesB = timeB ? timeB.getHours() * 60 + timeB.getMinutes() : Number.MAX_SAFE_INTEGER;

              if (minutesA !== minutesB) {
                  return minutesA - minutesB;
              }
              return a.title.localeCompare(b.title);
          });

          return (
            <li key={childId}>
                <div
                    style={{ backgroundColor: child.color, color: 'white' }}
                    className="inline-block rounded-full px-3 py-1 text-sm font-semibold shadow"
                >
                    {child.name}
                </div>
                <ul className="mt-2 space-y-2 border-l-2 pl-4" style={{ borderColor: child.color }}>
                    {childEvents.map(event => {
                        const popoverId = `${event.data.id}-${format(day, 'yyyy-MM-dd')}`;
                        const isCompleted = isMissionCompletedForDate(event.data, day);
                        const eventTime = event.data.startDate?.toDate() || event.data.dueDate?.toDate();
                        const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                        return(
                        <li key={event.data.id} className="text-sm text-muted-foreground leading-snug flex justify-between items-center gap-2">
                            <Popover open={activePopover === popoverId} onOpenChange={(isOpen) => {
                              setActivePopover(isOpen ? popoverId : null);
                              if (!isOpen) {
                                setHighlightedMissionId(null);
                              }
                            }}>
                              <PopoverTrigger asChild>
                                  <button 
                                      data-mission-id={popoverId}
                                      disabled={isProcessingAction === event.data.id} 
                                      className={cn("w-full text-left p-1 -m-1 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center", 
                                        "hover:bg-accent/50",
                                        isCompleted && "line-through text-muted-foreground/70",
                                        highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary ring-offset-background"
                                      )}
                                  >
                                      {isProcessingAction === event.data.id ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> : isCompleted && <CheckCircle className="h-4 w-4 inline-block mr-2 text-green-500" />}
                                      <span className="font-semibold text-foreground/80 mr-2 w-12 text-left">{formattedTime}</span>
                                      <span>{event.title}</span>
                                  </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                  <div className="flex flex-col gap-1">
                                    {isCompleted ? (
                                      <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)} className="justify-start"><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                    ) : (
                                      <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)} className="justify-start"><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)} className="justify-start"><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                    <Separator />
                                    <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDeleteClick(event.data, day)}><Trash2 className="mr-2 h-4 w-4" /> Excluir Missão</Button>
                                  </div>
                              </PopoverContent>
                            </Popover>
                        </li>
                        )
                    })}
                </ul>
            </li>
          );
        })}
      </ul>
    );
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
        '3days': 'grid-cols-1 md:grid-cols-3',
        week: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
        workweek: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    };
  
    const finalGridClass = isMobile ? 'grid-cols-1' : gridClasses[dateRangeFilter];

    return (
      <div className={cn("grid gap-4", finalGridClass)}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDate[dateKey] as { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { morning: [], afternoon: [], night: [] };
          const hasEventsForDay = dayEvents.morning.length > 0 || dayEvents.afternoon.length > 0 || dayEvents.night.length > 0;
          
          return (
            <div key={dateKey} className="flex flex-col space-y-2">
              <h2 className={cn("text-lg font-headline capitalize flex items-center gap-2 whitespace-nowrap", isToday(day) && "text-primary")}>
                {format(day, "EEEE, dd", { locale: ptBR })}
                {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
              </h2>
              
              <Card className="shadow-sm flex-1">
                {!hasEventsForDay ? (
                    <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                        Nenhuma missão.
                    </CardContent>
                ) : (
                    <CardContent className="p-4 space-y-4">
                      {dayEvents.morning.length > 0 && (
                        <div className={cn("space-y-2", "bg-yellow-500/5 p-3 rounded-lg")}>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>
                          {renderEventListForPeriod(dayEvents.morning, day)}
                        </div>
                      )}
                      {dayEvents.afternoon.length > 0 && (
                        <div className={cn("space-y-2", "bg-orange-500/5 p-3 rounded-lg")}>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>
                           {renderEventListForPeriod(dayEvents.afternoon, day)}
                        </div>
                      )}
                      {dayEvents.night.length > 0 && (
                        <div className={cn("space-y-2", "bg-indigo-500/5 p-3 rounded-lg")}>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>
                           {renderEventListForPeriod(dayEvents.night, day)}
                        </div>
                      )}
                    </CardContent>
                )}
              </Card>
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
                const childA = childrenMap.get(a.data.childId)?.name || '';
                const childB = childrenMap.get(b.data.childId)?.name || '';
                const nameComparison = childA.localeCompare(childB);
                if (nameComparison !== 0) return nameComparison;

                const timeA = a.data.startDate?.toDate() || a.data.dueDate?.toDate();
                const timeB = b.data.startDate?.toDate() || b.data.dueDate?.toDate();
                
                const minutesA = timeA ? timeA.getHours() * 60 + timeA.getMinutes() : Number.MAX_SAFE_INTEGER;
                const minutesB = timeB ? timeB.getHours() * 60 + timeB.getMinutes() : Number.MAX_SAFE_INTEGER;

                if (minutesA !== minutesB) {
                    return minutesA - minutesB;
                }
                return a.title.localeCompare(b.title);
              });
              
              return (
                <div key={dateKey} className={cn(
                    "h-28 sm:h-32 md:h-40 border-r border-b p-1 sm:p-2 flex flex-col",
                    !isSameMonth(day, currentDate) && "bg-muted/50 text-muted-foreground",
                    isToday(day) && "bg-accent/10"
                )}>
                  <div className={cn(
                      "font-semibold text-xs sm:text-sm",
                      isToday(day) && "flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground"
                  )}>{format(day, 'd')}</div>
                  <ScrollArea className="flex-1 mt-1">
                    <ul className="space-y-1">
                      {sortedEvents.map(event => {
                        const child = childrenMap.get(event.data.childId);
                        if (!child) return null;
                        const popoverId = `${event.data.id}-${dateKey}`;
                        const isCompleted = isMissionCompletedForDate(event.data, day);
                        const eventTime = event.data.startDate?.toDate() || event.data.dueDate?.toDate();
                        const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                        return (
                          <li key={event.data.id} className="text-xs flex items-start gap-1.5">
                              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                              <Popover open={activePopover === popoverId} onOpenChange={(isOpen) => {
                                setActivePopover(isOpen ? popoverId : null);
                                if (!isOpen) {
                                  setHighlightedMissionId(null);
                                }
                              }}>
                                  <PopoverTrigger asChild>
                                      <button 
                                          data-mission-id={popoverId}
                                          disabled={isProcessingAction === event.data.id} 
                                          className={cn("w-full text-left leading-tight p-1 -m-1 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-baseline", 
                                            "hover:bg-accent/50",
                                            isCompleted && "line-through text-muted-foreground/70",
                                            highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary ring-offset-background"
                                          )}
                                        >
                                          {isProcessingAction === event.data.id ? <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" /> : isCompleted && <CheckCircle className="h-3 w-3 inline-block mr-1 text-green-500" />}
                                          <span className="font-semibold text-foreground/80 mr-1">{formattedTime}</span>
                                          <span className="flex-1">{event.title}</span>
                                      </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2">
                                      <div className="flex flex-col gap-1">
                                          {isCompleted ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)} className="justify-start"><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                          ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)} className="justify-start"><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                          )}
                                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)} className="justify-start"><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                          <Separator/>
                                          <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDeleteClick(event.data, day)}><Trash2 className="mr-2 h-4 w-4" /> Excluir Missão</Button>
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
                      <CardTitle className="text-3xl font-headline flex items-center gap-2 whitespace-nowrap">
                          <CalendarIcon className="h-8 w-8 text-primary" />
                          Agenda dos Herois
                      </CardTitle>
                      <CardDescription>
                          Planeje e visualize as missões da sua equipe.
                      </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Período anterior">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={handleToday}>Hoje</Button>
                        <h2 className="text-sm font-medium text-center w-auto capitalize whitespace-nowrap px-2">
                            {formatHeaderDate(currentDate, dateRangeFilter, viewInterval)}
                        </h2>
                        <Button variant="outline" size="icon" onClick={handleNext} aria-label="Próximo período">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-10">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto" align="end">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4">
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Visão da Agenda</Label>
                                        <RadioGroup value={dateRangeFilter} onValueChange={(value) => handleFilterChange('view', value)} className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="day" id="view-day" />
                                                <Label htmlFor="view-day" className="font-normal cursor-pointer">1 Dia</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="3days" id="view-3days" />
                                                <Label htmlFor="view-3days" className="font-normal cursor-pointer">3 Dias</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="workweek" id="view-workweek" />
                                                <Label htmlFor="view-workweek" className="font-normal cursor-pointer">Semana Útil</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="week" id="view-week" />
                                                <Label htmlFor="view-week" className="font-normal cursor-pointer">Semana</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="month" id="view-month" />
                                                <Label htmlFor="view-month" className="font-normal cursor-pointer">Mês</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Período do Dia</Label>
                                        <RadioGroup value={timePeriodFilter} onValueChange={(value) => handleFilterChange('period', value)} className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="all" id="period-all" />
                                                <Label htmlFor="period-all" className="font-normal cursor-pointer">Todos</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="morning" id="period-morning" />
                                                <Label htmlFor="period-morning" className="font-normal flex items-center gap-2 cursor-pointer"><Sun className="h-4 w-4" />Manhã</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="afternoon" id="period-afternoon" />
                                                <Label htmlFor="period-afternoon" className="font-normal flex items-center gap-2 cursor-pointer"><CloudSun className="h-4 w-4" />Tarde</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="night" id="period-night" />
                                                <Label htmlFor="period-night" className="font-normal flex items-center gap-2 cursor-pointer"><Moon className="h-4 w-4" />Noite</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <div className="h-6 w-px bg-border mx-1"></div>

                        <Button variant="outline" className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" onClick={handleShowTodayMissions}>
                            <Target className="mr-2 h-4 w-4" /> Missões de Hoje
                        </Button>
                        <Button onClick={() => setIsSelectMissionDialogOpen(true)} size="icon">
                            <PlusCircle className="h-4 w-4" />
                            <span className="sr-only">Adicionar Missão</span>
                        </Button>
                      </div>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
            <Separator/>
            <div className="w-full pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                    size="sm"
                    variant="outline"
                    pressed={selectedChildrenIds.length === 0}
                    onPressedChange={(pressed) => {
                      if (pressed) {
                        setSelectedChildrenIds([])
                      }
                    }}
                    className="h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                    Todos
                </Toggle>
                {children.map(child => {
                  const isPressed = selectedChildrenIds.includes(child.id);
                  return (
                    <Toggle
                        key={child.id}
                        size="sm"
                        className={cn(
                            "h-9 px-3 rounded-md text-white border-0 transition-all duration-200",
                            isPressed
                              ? 'opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md'
                              : 'opacity-70 hover:opacity-100'
                        )}
                        style={{ backgroundColor: child.color }}
                        pressed={isPressed}
                        onPressedChange={(pressed) => {
                          const otherIds = selectedChildrenIds.filter(id => id !== child.id);
                          if (pressed) {
                            setSelectedChildrenIds([...otherIds, child.id]);
                          } else {
                            setSelectedChildrenIds(otherIds);
                          }
                        }}
                    >
                        {child.name}
                    </Toggle>
                  )
                })}
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

      <DeleteRecurrenceDialog
        isOpen={isDeleteRecurrenceDialogOpen}
        onOpenChange={setIsDeleteRecurrenceDialogOpen}
        onSelect={handleConfirmRecurrenceDelete}
      />

      <AlertDialog open={isConfirmSimpleDeleteOpen} onOpenChange={setIsConfirmSimpleDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta missão?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover a missão "{instanceToDeleteInfo?.instance.title}" da agenda de <strong>{instanceToDeleteInfo ? childrenMap.get(instanceToDeleteInfo.instance.childId)?.name : ''}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessingAction === instanceToDeleteInfo?.instance.id}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSimpleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction === instanceToDeleteInfo?.instance.id}>
                    {isProcessingAction === instanceToDeleteInfo?.instance.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sim, Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!instanceToExclude} onOpenChange={(isOpen) => !isOpen && setInstanceToExclude(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta ocorrência?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover a missão "{instanceToExclude?.instance.title}" para o Mini Heroi <strong>{instanceToExclude ? childrenMap.get(instanceToExclude.instance.childId)?.name : ''}</strong> apenas para o dia {instanceToExclude && format(instanceToExclude.date, 'dd/MM/yyyy')}?
                    <br />
                    As outras repetições não serão afetadas.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessingAction === instanceToExclude?.instance.id}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmExclusion} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction === instanceToExclude?.instance.id}>
                    {isProcessingAction === instanceToExclude?.instance.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sim, Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AgendaPageContent />
    </Suspense>
  )
}
