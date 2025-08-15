

"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, addDays, subDays, eachDayOfInterval, startOfDay, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, ListOrdered, User, X, PlusCircle, MoreHorizontal, CheckSquare, Square, Edit, Undo2, Sun, CloudSun, Moon, Star as StarIcon, BadgeCheck, Trash2, Target, Filter, ArrowLeft, NotebookPen, Edit3, Repeat, FileText, CalendarDays, HelpCircle } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getMissionTemplateById, completeMissionInstance, reactivateMissionInstance, excludeMissionInstanceOccurrence, updateRecurringMissionInstance, deleteMissionInstance, deleteFutureOccurrences } from '@/lib/firebase/firestore';
import { isMissionScheduledForDate, isMissionCompletedForDate, formatRecurrenceSummary, getDateObject } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance, MissionTemplate, MissionCategoryDetails, FamilyRole } from '@/lib/types';
import { missionCategories, weekdays, familyRoles } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Loading from './loading';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AssignMissionDialog, type EditRecurrenceMode } from '@/components/dashboard/missions/AssignMissionDialog';
import { SelectMissionTemplateDialog } from '@/components/dashboard/missions/SelectMissionTemplateDialog';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { EditRecurrenceDialog } from '@/components/dashboard/missions/EditRecurrenceDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DeleteRecurrenceDialog } from '@/components/dashboard/missions/DeleteRecurrenceDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"


export type DateRangeFilter = 'day' | '3days' | 'week' | 'workweek' | 'month';
export type TimePeriod = 'all' | 'morning' | 'afternoon' | 'night';

interface CalendarEvent {
  date: Date;
  title: string;
  type: 'mission' | 'school';
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
  const { currentContext, availableContexts, currentRole, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  
  const [currentDate, setCurrentDate] = useState(() => {
    const focusDateParam = searchParams.get('focus_date');
    if (focusDateParam) {
      const [year, month, day] = focusDateParam.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

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

  // States for filters, initialized from URL
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(
    () => (searchParams.get('view') || '3days') as DateRangeFilter
  );
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriod>(
    () => (searchParams.get('period') || 'all') as TimePeriod
  );
  
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const handleSelectedChildChange = (id: string | null) => {
    setSelectedChildId(id);
  }

  const handleShowTodayMissions = () => {
    setCurrentDate(new Date());
    setDateRangeFilter('day');
  };

  useEffect(() => {
    const openPopoverParam = searchParams.get('open_popover');
    
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
  }, [searchParams]);


  const refetchData = useCallback(async () => {
    if (!user) return;
    try {
      const instances = await getMissionInstancesForContext(user.uid, currentContext);
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
        const [fetchedChildren, fetchedInstances] = await Promise.all([
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, currentContext)
        ]);
        
        setChildren(fetchedChildren);
        setMissionInstances(fetchedInstances);
        
        if (selectedChildId && !fetchedChildren.some(c => c.id === selectedChildId)) {
            setSelectedChildId(null);
        } else if (!selectedChildId && fetchedChildren.length === 1) {
            setSelectedChildId(fetchedChildren[0].id);
        }

      } catch (error) {
        console.error("Error fetching agenda data for new context:", error);
        toast({ title: 'Erro ao carregar agenda', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    loadDataForContext();
  }, [user, currentContext, toast, selectedChildId, setSelectedChildId]);
  
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
  
  const handleEditTemplateClick = (instance: MissionInstance) => {
    router.push(`/dashboard/missions/edit/${instance.templateId}`);
  }

  const handleAssignmentComplete = () => {
    refetchData();
  };

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const categoryMap = useMemo(() => new Map(missionCategories.map(cat => [cat.id, cat])), []);


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
    const childrenToProcess = !selectedChildId
      ? children 
      : children.filter(c => c.id === selectedChildId);
      
    const instancesToProcess = missionInstances.filter(inst => childrenToProcess.some(c => c.id === inst.childId));

    const acc: Record<string, { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }> = {};
    const daysInView = eachDayOfInterval(viewInterval);
    
    daysInView.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        acc[dateKey] = { morning: [], afternoon: [], night: [] };
    });

    // Process Mission Instances
    instancesToProcess.forEach(instance => {
      const eventTimeSource = getDateObject(instance.startDate) || getDateObject(instance.dueDate);
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
            type: 'mission',
            data: instance,
          };
          
          acc[dateKey][period].push(event);
        }
      });
    });

    // Process School Events
    childrenToProcess.forEach(child => {
        if (child.schoolShift && child.schoolShift !== 'not_applicable' && child.schoolShiftStart && child.schoolShiftEnd) {
            daysInView.forEach(day => {
                const dayOfWeek = day.getDay(); // 0=Sun, 1=Mon, ...
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Only on weekdays
                    const dateKey = format(day, 'yyyy-MM-dd');

                    const createSchoolEvent = (time: string, title: string): CalendarEvent => {
                        const [hour, minute] = time.split(':').map(Number);
                        const eventDate = new Date(day);
                        eventDate.setHours(hour, minute);
                        
                        return {
                            date: eventDate,
                            title: title,
                            type: 'school',
                            data: { // Synthetic data
                                id: `school-${child.id}-${title}-${dateKey}`,
                                childId: child.id,
                                title: title,
                                category: 'school',
                                startDate: eventDate,
                            } as any,
                        };
                    };
                    
                    const startEvent = createSchoolEvent(child.schoolShiftStart, 'Entrada na Escola');
                    const endEvent = createSchoolEvent(child.schoolShiftEnd, 'Saída da Escola');

                    const startPeriod = getPeriodForDate(startEvent.date);
                    const endPeriod = getPeriodForDate(endEvent.date);

                    if (timePeriodFilter === 'all' || timePeriodFilter === startPeriod) {
                        acc[dateKey][startPeriod].push(startEvent);
                    }
                    if (timePeriodFilter === 'all' || timePeriodFilter === endPeriod) {
                        acc[dateKey][endPeriod].push(endEvent);
                    }
                }
            });
        }
    });

    return acc;
  }, [viewInterval, missionInstances, selectedChildId, timePeriodFilter, children]);
  
  const handlePrev = () => {
    let newDate;
    if (dateRangeFilter === 'month') {
        newDate = subMonths(currentDate, 1);
    } else {
        const daysToSubtract = dateRangeFilter === '3days' ? 3 : dateRangeFilter === 'day' ? 1 : 7;
        newDate = subDays(currentDate, daysToSubtract);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
      let newDate;
      if (dateRangeFilter === 'month') {
          newDate = addMonths(currentDate, 1);
      } else {
          const daysToAdd = dateRangeFilter === '3days' ? 3 : dateRangeFilter === 'day' ? 1 : 7;
          newDate = addDays(currentDate, daysToAdd);
      }
      setCurrentDate(newDate);
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleCompleteMission = async (missionInstance: MissionInstance, date: Date) => {
    if (!user) return;
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        const actor = { id: user.uid, name: user.name };
        const result = await completeMissionInstance(missionInstance.id, date, actor);
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
    if (!user) return;
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null);
    try {
        const actor = { id: user.uid, name: user.name };
        const result = await reactivateMissionInstance(missionInstance.id, date, actor);
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
      if (!instanceToDeleteInfo || !user) return;
      
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
              await deleteMissionInstance(user, instance.id);
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
      if (!instanceToDeleteInfo || !user) return;
      const { instance } = instanceToDeleteInfo;
      setIsProcessingAction(instance.id);
      setIsConfirmSimpleDeleteOpen(false);

      try {
          await deleteMissionInstance(user, instance.id);
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
    if (range === 'day') return format(date, "EEEE, dd/MM/yy", { locale: ptBR });
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

  const renderEventListForPeriod = (events: CalendarEvent[], day: Date, showEmoji: boolean) => {
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
        <ul className={cn("space-y-4", selectedChildId && 'pt-0')}>
          {sortedChildIds.map(childId => {
            const child = childrenMap.get(childId);
            if (!child) return null;
            const childEvents = eventsByChild[childId].sort((a, b) => {
                const timeA = getDateObject(a.data.startDate) || getDateObject(a.data.dueDate);
                const timeB = getDateObject(b.data.startDate) || getDateObject(b.data.dueDate);
                
                const minutesA = timeA ? timeA.getHours() * 60 + timeA.getMinutes() : Number.MAX_SAFE_INTEGER;
                const minutesB = timeB ? timeB.getHours() * 60 + timeB.getMinutes() : Number.MAX_SAFE_INTEGER;

                if (minutesA !== minutesB) {
                    return minutesA - minutesB;
                }
                return a.title.localeCompare(b.title);
            });

            return (
              <li key={childId} className={cn(!selectedChildId && "relative pt-12")}>
                  <ul className={cn("space-y-1.5")}>
                      {childEvents.map(event => {
                          const popoverId = `${event.data.id}-${format(day, 'yyyy-MM-dd')}`;
                          const isCompleted = event.type === 'mission' && isMissionCompletedForDate(event.data, day);
                          const eventTime = getDateObject(event.data.startDate) || getDateObject(event.data.dueDate);
                          const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                          
                          if (event.type === 'school') {
                              return (
                                  <li key={event.data.id} className="text-sm text-muted-foreground leading-snug flex items-center p-1 -m-1">
                                      <NotebookPen className="h-4 w-4 inline-block text-gray-500 shrink-0" />
                                      <span className="font-semibold text-foreground/80 w-12 text-left ml-1.5 mr-0.5 text-xs">{formattedTime}</span>
                                      <span className="flex-1 truncate font-semibold text-foreground/80">{event.title}</span>
                                  </li>
                              )
                          }
                          
                          const categoryDetails = categoryMap.get(event.data.category);

                          return(
                          <li key={event.data.id} className="text-sm text-muted-foreground leading-snug flex justify-between items-center">
                              <Popover open={activePopover === popoverId && canEdit} onOpenChange={(isOpen) => {
                                setActivePopover(isOpen ? popoverId : null);
                                if (!isOpen) {
                                  setHighlightedMissionId(null);
                                }
                              }}>
                                <PopoverTrigger asChild>
                                    <button 
                                        data-mission-id={popoverId}
                                        disabled={isProcessingAction === event.data.id || isFamilyLoading} 
                                        className={cn("w-full text-left p-1 -m-1 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5", 
                                          "hover:bg-accent/50",
                                          isCompleted && "text-muted-foreground/70",
                                          highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary ring-offset-background"
                                        )}
                                    >
                                      {isProcessingAction === event.data.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin inline-block shrink-0" />
                                      ) : isCompleted ? (
                                        <CheckSquare className="h-4 w-4 inline-block text-green-500 shrink-0" />
                                      ) : (
                                        <Square className="h-4 w-4 inline-block text-primary shrink-0" />
                                      )}
                                      <span className={cn("font-semibold text-foreground/80 text-xs", isCompleted && "line-through")}>{formattedTime}</span>
                                      {showEmoji && event.data.emoji && <span className="text-xl">{event.data.emoji}</span>}
                                      <span className={cn("flex-1 truncate font-semibold text-foreground/80", isCompleted && "line-through")}>{event.title}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                              <AvatarImage src={child.avatar} alt={child.name}/>
                                              <AvatarFallback style={{backgroundColor: child.color}}>
                                                {getInitials(child.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="font-semibold">{child.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                  Ocorrência de {format(day, 'dd/MM/yyyy')}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                          {event.data.emoji && <span className="text-xl">{event.data.emoji}</span>}
                                          {event.data.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {categoryDetails && (
                                                <Badge variant="outline" className={cn("text-xs", categoryDetails.colorClasses)}>
                                                    {categoryDetails.label}
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                              <Repeat className="h-3 w-3"/>
                                              <span className="text-xs">{formatRecurrenceSummary(event.data)}</span>
                                            </Badge>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                                          <span className="flex items-center gap-1.5">
                                            <StarIcon className="h-4 w-4 text-yellow-500"/>
                                            <span className="font-semibold text-foreground">{event.data.starsReward}</span>
                                          </span>
                                           <span className="flex items-center gap-1.5">
                                            <BadgeCheck className="h-4 w-4 text-blue-500"/>
                                             <span className="font-semibold text-foreground">{event.data.xpReward} XP</span>
                                          </span>
                                        </div>

                                    </div>
                                    <Separator/>
                                    <div className="p-2 flex flex-col gap-1">
                                      {isCompleted ? (
                                        <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)} className="justify-start"><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                      ) : (
                                        <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)} className="justify-start"><CheckSquare className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                      )}
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)} className="justify-start"><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleEditTemplateClick(event.data)} className="justify-start"><Edit3 className="mr-2 h-4 w-4" /> Editar Missão (Catálogo)</Button>
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
    
    // Updated responsive grid classes
    const gridClasses = {
        day: 'grid-cols-1',
        '3days': 'grid-cols-1 md:grid-cols-3',
        week: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7', // More responsive steps
        workweek: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    };
  
    const finalGridClass = gridClasses[dateRangeFilter as keyof typeof gridClasses];
    const showEmojiInGrid = dateRangeFilter === 'day' || dateRangeFilter === '3days';

    // Different rendering logic for mobile vs desktop for 'week' view
    if (isMobile && (dateRangeFilter === 'week' || dateRangeFilter === 'workweek')) {
        return (
            <ScrollArea className="w-full">
                <div className="flex pb-4 gap-4" style={{ width: `${days.length * 80}vw`, minWidth: '100%'}}>
                    {days.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = (eventsByDate[dateKey] as { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { morning: [], afternoon: [], night: [] };
                        const hasEventsForDay = dayEvents.morning.length > 0 || dayEvents.afternoon.length > 0 || dayEvents.night.length > 0;
                        const child = selectedChildId ? childrenMap.get(selectedChildId) : null;
                        
                        return (
                            <div key={dateKey} className="w-[75vw] flex-shrink-0 space-y-2">
                                <h2 className={cn("text-lg font-headline capitalize flex items-center gap-2 whitespace-nowrap mb-2", isToday(day) && "text-primary")}>
                                    {format(day, "EEEE, dd/MM/yy", { locale: ptBR })}
                                    {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
                                </h2>
                               {selectedChildId && child ? (
                                    <div className="flex items-center gap-3 mb-2">
                                      <Avatar
                                        className="h-9 w-9 ring-2 ring-offset-background ring-[var(--ring-color)]"
                                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                      >
                                          <AvatarImage src={child.avatar} alt={child.name} />
                                          <AvatarFallback style={{backgroundColor: child.color}}>
                                              {getInitials(child.name)}
                                          </AvatarFallback>
                                      </Avatar>
                                      <h4 className="font-semibold text-foreground/90">{child.name}</h4>
                                    </div>
                               ) : (
                                  <AllHeroesDayAccordion day={day} events={dayEvents} />
                               )}
                                <Card className="shadow-sm flex-1">
                                    {!hasEventsForDay ? (
                                        <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                                            Nenhuma missão.
                                        </CardContent>
                                    ) : (
                                        <CardContent className="p-4 space-y-4">
                                            {dayEvents.morning.length > 0 && (
                                                <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>{renderEventListForPeriod(dayEvents.morning, day, true)}</div>
                                            )}
                                            {dayEvents.afternoon.length > 0 && (
                                                <div className="relative space-y-2 bg-orange-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>{renderEventListForPeriod(dayEvents.afternoon, day, true)}</div>
                                            )}
                                            {dayEvents.night.length > 0 && (
                                                <div className="relative space-y-2 bg-indigo-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>{renderEventListForPeriod(dayEvents.night, day, true)}</div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        );
    }
    
    // Desktop rendering for all views
    return (
      <div className={cn("grid gap-4", finalGridClass)}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDate[dateKey] as { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { morning: [], afternoon: [], night: [] };
          const hasEventsForDay = dayEvents.morning.length > 0 || dayEvents.afternoon.length > 0 || dayEvents.night.length > 0;
          
          return (
            <div key={dateKey} className="flex flex-col space-y-2">
              <h2 className={cn("text-lg font-headline capitalize flex items-center gap-2 whitespace-nowrap", isToday(day) && "text-primary")}>
                {format(day, "EEEE, dd/MM/yy", { locale: ptBR })}
                {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
              </h2>
              {selectedChildId ? (
                  <div className="flex items-center gap-3">
                      <Avatar
                          className="h-9 w-9 ring-2 ring-offset-background ring-[var(--ring-color)]"
                          style={childrenMap.get(selectedChildId)?.color ? { '--ring-color': childrenMap.get(selectedChildId)?.color } as React.CSSProperties : {}}
                      >
                          <AvatarImage src={childrenMap.get(selectedChildId)?.avatar} alt={childrenMap.get(selectedChildId)?.name} />
                          <AvatarFallback style={{backgroundColor: childrenMap.get(selectedChildId)?.color}}>
                              {getInitials(childrenMap.get(selectedChildId)?.name)}
                          </AvatarFallback>
                      </Avatar>
                      <h4 className="font-semibold text-foreground/90">{childrenMap.get(selectedChildId)?.name}</h4>
                  </div>
              ) : (
                 <AllHeroesDayAccordion day={day} events={dayEvents} />
              )}
              
               <div className={cn(!selectedChildId && "border-t pt-2 mt-2")}>
                  {!hasEventsForDay ? (
                      <Card className="shadow-sm flex-1">
                          <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                              Nenhuma missão.
                          </CardContent>
                      </Card>
                  ) : selectedChildId ? (
                       <Card className="shadow-sm flex-1">
                          <CardContent className="p-4 space-y-4">
                              {dayEvents.morning.length > 0 && (
                                <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>{renderEventListForPeriod(dayEvents.morning, day, showEmojiInGrid)}</div>
                              )}
                              {dayEvents.afternoon.length > 0 && (
                                <div className="relative space-y-2 bg-orange-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>{renderEventListForPeriod(dayEvents.afternoon, day, showEmojiInGrid)}</div>
                              )}
                              {dayEvents.night.length > 0 && (
                                <div className="relative space-y-2 bg-indigo-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>{renderEventListForPeriod(dayEvents.night, day, showEmojiInGrid)}</div>
                              )}
                          </CardContent>
                       </Card>
                  ) : null }
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const AllHeroesDayAccordion = ({ day, events }: { day: Date, events: { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] } }) => {
    const eventsByChild = [...events.morning, ...events.afternoon, ...events.night].reduce((acc, event) => {
        if (!acc[event.data.childId]) {
            acc[event.data.childId] = { morning: [], afternoon: [], night: [] };
        }
        const period = getPeriodForDate(getDateObject(event.data.startDate) || getDateObject(event.data.dueDate)!);
        acc[event.data.childId][period].push(event);
        return acc;
    }, {} as Record<string, { morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }>);
    
    const sortedChildKeys = Object.keys(eventsByChild).sort((a,b) => {
        const nameA = childrenMap.get(a)?.name || '';
        const nameB = childrenMap.get(b)?.name || '';
        return nameA.localeCompare(nameB);
    });

    return (
        <Accordion type="multiple" className="w-full space-y-2" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
            {sortedChildKeys.map((childId) => {
                const child = childrenMap.get(childId);
                if (!child) return null;
                const childEvents = eventsByChild[childId];
                
                const morningTotal = childEvents.morning.length;
                const morningCompleted = childEvents.morning.filter(e => e.type === 'mission' && isMissionCompletedForDate(e.data, day)).length;
                
                const afternoonTotal = childEvents.afternoon.length;
                const afternoonCompleted = childEvents.afternoon.filter(e => e.type === 'mission' && isMissionCompletedForDate(e.data, day)).length;
                
                const nightTotal = childEvents.night.length;
                const nightCompleted = childEvents.night.filter(e => e.type === 'mission' && isMissionCompletedForDate(e.data, day)).length;
                
                return (
                    <AccordionItem value={childId} key={childId} className="border-none">
                         <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: `${child.color}10`}}>
                            <AccordionTrigger className="p-3 hover:no-underline">
                                <div className="flex flex-col items-start gap-2 w-full text-left">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <h4 className="font-semibold">{child.name}</h4>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-x-2 font-mono pl-12">
                                        <span>Manhã: {morningCompleted}/{morningTotal}</span>
                                        <span>Tarde: {afternoonCompleted}/{afternoonTotal}</span>
                                        <span>Noite: {nightCompleted}/{nightTotal}</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0 border-t bg-card" style={{borderColor: `${child.color}30`}}>
                                <div className="space-y-4 pt-2">
                                  {childEvents.morning.length > 0 && (
                                    <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>{renderEventListForPeriod(childEvents.morning, day, true)}</div>
                                  )}
                                  {childEvents.afternoon.length > 0 && (
                                    <div className="relative space-y-2 bg-orange-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>{renderEventListForPeriod(childEvents.afternoon, day, true)}</div>
                                  )}
                                  {childEvents.night.length > 0 && (
                                    <div className="relative space-y-2 bg-indigo-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>{renderEventListForPeriod(childEvents.night, day, true)}</div>
                                  )}
                                </div>
                            </AccordionContent>
                         </div>
                    </AccordionItem>
                )
            })}
        </Accordion>
    )
  }

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

                const timeA = getDateObject(a.data.startDate) || getDateObject(a.data.dueDate);
                const timeB = getDateObject(b.data.startDate) || getDateObject(b.data.dueDate);
                
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
                        const isCompleted = event.type === 'mission' && isMissionCompletedForDate(event.data, day);
                        const eventTime = getDateObject(event.data.startDate) || getDateObject(event.data.dueDate);
                        const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                         const categoryDetails = categoryMap.get(event.data.category);


                        if (event.type === 'school') {
                           return (
                                <li key={event.data.id} className="text-xs flex items-start gap-1.5 p-1 -m-1">
                                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                                    <div className="w-full text-left leading-tight flex items-center">
                                        <NotebookPen className="h-3 w-3 inline-block mr-1 text-gray-500 shrink-0" />
                                        <span className="font-semibold text-foreground/80 mr-1 text-xs">{formattedTime}</span>
                                        <span className="flex-1 truncate font-semibold text-foreground/80">{event.title}</span>
                                    </div>
                                </li>
                           )
                        }

                        return (
                          <li key={event.data.id} className="text-xs flex items-start gap-1.5">
                              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: child.color }}></div>
                              <Popover open={activePopover === popoverId && canEdit} onOpenChange={(isOpen) => {
                                setActivePopover(isOpen ? popoverId : null);
                                if (!isOpen) {
                                  setHighlightedMissionId(null);
                                }
                              }}>
                                  <PopoverTrigger asChild>
                                      <button 
                                          data-mission-id={popoverId}
                                          disabled={isProcessingAction === event.data.id || isFamilyLoading} 
                                          className={cn("w-full text-left leading-tight p-1 -m-1 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center", 
                                            "hover:bg-accent/50",
                                            isCompleted && "text-muted-foreground/70",
                                            highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary-offset"
                                          )}
                                        >
                                          {isProcessingAction === event.data.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin inline-block mr-1 shrink-0" />
                                          ) : isCompleted ? (
                                            <CheckSquare className="h-3 w-3 inline-block mr-1 text-green-500 shrink-0" />
                                          ) : (
                                            <Square className="h-3 w-3 inline-block mr-1 text-primary shrink-0" />
                                          )}
                                          <span className={cn("font-semibold text-foreground/80 mr-1 text-xs", isCompleted && "line-through")}>{formattedTime}</span>
                                          <span className={cn("flex-1 truncate font-semibold text-foreground/80", isCompleted && "line-through")}>{event.title}</span>
                                      </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-0">
                                      <div className="p-4 space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="h-10 w-10">
                                                <AvatarImage src={child.avatar} alt={child.name}/>
                                                <AvatarFallback style={{backgroundColor: child.color}}>
                                                  {getInitials(child.name)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-semibold">{child.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Ocorrência de {format(day, 'dd/MM/yyyy')}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                          <h3 className="text-lg font-semibold flex items-center gap-2">
                                            {event.data.emoji && <span className="text-xl">{event.data.emoji}</span>}
                                            {event.data.title}
                                          </h3>
                                          <div className="flex flex-wrap items-center gap-2">
                                              {categoryDetails && (
                                                  <Badge variant="outline" className={cn("text-xs", categoryDetails.colorClasses)}>
                                                      {categoryDetails.label}
                                                  </Badge>
                                              )}
                                              <Badge variant="secondary" className="flex items-center gap-1">
                                                <Repeat className="h-3 w-3"/>
                                                <span className="text-xs">{formatRecurrenceSummary(event.data)}</span>
                                              </Badge>
                                          </div>
                                          
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                                            <span className="flex items-center gap-1.5">
                                              <StarIcon className="h-4 w-4 text-yellow-500"/>
                                              <span className="font-semibold text-foreground">{event.data.starsReward}</span>
                                            </span>
                                             <span className="flex items-center gap-1.5">
                                              <BadgeCheck className="h-4 w-4 text-blue-500"/>
                                               <span className="font-semibold text-foreground">{event.data.xpReward} XP</span>
                                            </span>
                                          </div>

                                      </div>
                                      <Separator/>
                                      <div className="p-2 flex flex-col gap-1">
                                          {isCompleted ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleUndoCompletion(event.data, day)} className="justify-start"><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                          ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleCompleteMission(event.data, day)} className="justify-start"><CheckSquare className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
                                          )}
                                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(event.data, day)} className="justify-start"><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</Button>
                                           <Button variant="ghost" size="sm" onClick={() => handleEditTemplateClick(event.data)} className="justify-start"><Edit3 className="mr-2 h-4 w-4" /> Editar Missão (Catálogo)</Button>
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
  
  if (isLoading || isFamilyLoading) return <Loading />;

  const renderContent = () => {
    if (dateRangeFilter === 'month') {
        return renderCalendarView();
    }
    return renderGridView();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <CalendarDays className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-headline font-bold whitespace-nowrap">Rotina de Missões</h2>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-3">
                            <p className="text-sm">Esta é a sua central de comando para visualizar e gerenciar o dia a dia dos seus heróis. Agende missões recorrentes ou únicas e acompanhe o que precisa ser feito a cada dia. Use os filtros para alternar entre as visualizações de dia, semana ou mês.</p>
                            <PopoverClose asChild>
                                <Button className="w-full">Entendi 👍</Button>
                            </PopoverClose>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
             <div className="flex w-full flex-row items-center justify-end gap-2">
                {children.length > 1 && (
                    <div className="flex-grow sm:flex-grow-0">
                        <HeroSelector
                            heroes={children}
                            selectedHeroId={selectedChildId}
                            onSelectHero={handleSelectedChildChange}
                            showAllOption={true}
                        />
                    </div>
                )}
                {canEdit && (
                    <Button onClick={() => setIsSelectMissionDialogOpen(true)} className="flex-shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Adicionar Missão</span>
                         <span className="sm:hidden">Adicionar</span>
                    </Button>
                )}
            </div>
        </div>

        <Card>
            <div className="p-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-grow">
                  <Button variant="outline" onClick={handleToday} className="h-9 px-3 hidden sm:inline-flex">Hoje</Button>
                  <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Período anterior" className="h-9 w-9">
                          <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleNext} aria-label="Próximo período" className="h-9 w-9">
                          <ChevronRight className="h-4 w-4" />
                      </Button>
                  </div>
                  <h2 className="text-sm sm:text-base font-medium text-center capitalize flex-grow sm:flex-grow-0">
                    {formatHeaderDate(currentDate, dateRangeFilter, viewInterval)}
                  </h2>
                </div>

                <div className="flex items-center justify-end gap-x-2 gap-y-2 flex-wrap">
                   <Button variant="outline" onClick={handleToday} className="h-9 px-3 sm:hidden flex-grow">Hoje</Button>
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
                        <SelectTrigger className="w-full sm:w-[140px] h-9">
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
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={timePeriodFilter} onValueChange={(v) => setTimePeriodFilter(v as TimePeriod)}>
                        <SelectTrigger className="w-full sm:w-[130px] h-9">
                            <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <span className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-yellow-500" />
                                    <CloudSun className="h-4 w-4 text-orange-500" />
                                    <Moon className="h-4 w-4 text-indigo-500" />
                                </span>
                            </SelectItem>
                            <SelectItem value="morning">
                                <span className="flex items-center gap-2"><Sun className="h-4 w-4 text-yellow-500" />Manhã</span>
                            </SelectItem>
                            <SelectItem value="afternoon">
                                <span className="flex items-center gap-2"><CloudSun className="h-4 w-4 text-orange-500" />Tarde</span>
                            </SelectItem>
                            <SelectItem value="night">
                                <span className="flex items-center gap-2"><Moon className="h-4 w-4 text-indigo-500" />Noite</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
            </div>
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

    
