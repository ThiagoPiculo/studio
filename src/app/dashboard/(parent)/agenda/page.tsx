
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, addDays, subDays, eachDayOfInterval, startOfDay, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, CalendarIcon, ListOrdered, User, X, PlusCircle, MoreHorizontal, CheckSquare, Square, Edit, Undo2, Sun, CloudSun, Moon, Star as StarIcon, BadgeCheck, Trash2, Target, Filter, ArrowLeft, NotebookPen, Edit3, Repeat, FileText, CalendarDays, HelpCircle, ExternalLink, View, Sparkles, MoreVertical, Circle, CheckCircle, Heart, Printer } from 'lucide-react';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getMissionTemplateById, completeMissionInstance, reactivateMissionInstance, excludeMissionInstanceOccurrence, updateRecurringMissionInstance, deleteMissionInstance, deleteFutureOccurrences } from '@/lib/firebase/firestore';
import { isMissionScheduledForDate, isMissionCompletedForDate, formatRecurrenceSummary, getDateObject, convertTimestampsInObject } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance, MissionTemplate, MissionCategoryDetails, FamilyRole, Weekday } from '@/lib/types';
import { missionCategories, weekdays, familyRoles, allWeekdays, weekdayLabels } from '@/lib/types';
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
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { EditRecurrenceDialog, type EditRecurrenceMode } from '@/components/dashboard/missions/EditRecurrenceDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DeleteRecurrenceDialog } from '@/components/dashboard/missions/DeleteRecurrenceDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion";
import { Switch } from '@/components/ui/switch';
import { CompleteMissionConfirmationDialog } from '@/components/dashboard/missions/CompleteMissionConfirmationDialog';
import Link from 'next/link';

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

const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) {
        return s;
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'MH';

const PrintableAgenda = ({ child, missionInstances, currentDate }: { child: ChildProfile | null, missionInstances: MissionInstance[], currentDate: Date }) => {
    
    const weeklyEventsForPrint = useMemo(() => {
        if (!child) return {};
        const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
        const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
        const daysOfWeek = eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek });
        const eventsByDay: Record<Weekday, CalendarEvent[]> = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };
        
        const childMissions = missionInstances.filter(inst => inst.childId === child.id);

        daysOfWeek.forEach(day => {
            const dayOfWeekKey = allWeekdays[day.getDay() === 0 ? 6 : day.getDay() - 1];
            childMissions.forEach(mission => {
                if (isMissionScheduledForDate(mission, day)) {
                    eventsByDay[dayOfWeekKey].push({
                        date: day,
                        title: mission.title,
                        type: 'mission',
                        data: mission,
                    });
                }
            });
            eventsByDay[dayOfWeekKey].sort((a, b) => {
                const timeA = getDateObject(a.data.isRecurring ? a.data.startDate : a.data.dueDate) || new Date(0);
                const timeB = getDateObject(b.data.isRecurring ? b.data.startDate : b.data.dueDate) || new Date(0);
                return timeA.getTime() - timeB.getTime();
            });
        });

        return eventsByDay;
    }, [currentDate, missionInstances, child]);

    if (!child) return null;

    return (
        <div className="printable-agenda-container">
            {allWeekdays.map((day) => (
                <div key={day} className="day-column">
                    <div className="day-header">
                        <span className="day-title">{weekdayLabels[day].long}</span>
                        <div className="hero-info">
                            <Avatar className="hero-avatar">
                                <AvatarImage src={child.avatar} alt={child.name} />
                                <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                            </Avatar>
                            <span className="hero-name">{child.name}</span>
                        </div>
                    </div>
                    <div className="missions-list">
                        {(weeklyEventsForPrint[day as Weekday] || []).map(event => (
                            <div key={event.data.id} className="mission-card-print">
                                <div className="mission-icon-print">{event.data.emoji || '🎯'}</div>
                                <div className="mission-details-print">
                                    <div className="mission-meta-line-print">
                                        <span>{format(getDateObject(event.data.isRecurring ? event.data.startDate : event.data.dueDate)!, 'HH:mm')}</span>
                                        <span className="separator">|</span>
                                        <span className="reward-print">+{event.data.starsReward} ⭐</span>
                                    </div>
                                    <div className="mission-title-print">{event.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

function AgendaPageContent() {
  const { user } = useAuth();
  const { currentContext, availableContexts, currentRole, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  
  const [instanceToEdit, setInstanceToEdit] = useState<MissionInstance | null>(null);
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<EditRecurrenceMode | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState<Date | null>(null);
  
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [highlightedMissionId, setHighlightedMissionId] = useState<string | null>(null);
  const [instanceToExclude, setInstanceToExclude] = useState<{ instance: MissionInstance; date: Date } | null>(null);

  const [instanceToDeleteInfo, setInstanceToDeleteInfo] = useState<{ instance: MissionInstance; date: Date } | null>(null);
  const [isDeleteRecurrenceDialogOpen, setIsDeleteRecurrenceDialogOpen] = useState(false);
  const [isConfirmSimpleDeleteOpen, setIsConfirmSimpleDeleteOpen] = useState(false);
  const [isRecurrenceEditOpen, setIsRecurrenceEditOpen] = useState(false);

  // States for filters, initialized from URL
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(
    () => (searchParams.get('view') || '3days') as DateRangeFilter
  );
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriod>(
    () => (searchParams.get('period') || 'all') as TimePeriod
  );
  
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isKidsView, setIsKidsView] = useState(false);

  const [confirmingMission, setConfirmingMission] = useState<{ instance: MissionInstance; date: Date } | null>(null);

  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const childForPrint = selectedChildId ? childrenMap.get(selectedChildId) : (children.length > 0 ? children[0] : null);


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

  // Real-time data fetching
  useEffect(() => {
    if (!user || isFamilyLoading) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchInitialData = async () => {
        try {
            const fetchedChildren = await getChildProfilesForAttribution(user.uid, currentContext);
            setChildren(fetchedChildren);

            if (selectedChildId && !fetchedChildren.some(c => c.id === selectedChildId)) {
                setSelectedChildId(null);
            } else if (!selectedChildId && fetchedChildren.length === 1) {
                setSelectedChildId(fetchedChildren[0].id);
            }
        } catch (error) {
            console.error("Error fetching children data:", error);
            toast({ title: 'Erro ao carregar heróis', variant: 'destructive' });
        }
    };

    fetchInitialData();
    
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
    let q;
    if (familyIdToQuery) {
        q = query(collection(db, 'missionInstances'), where('familyId', '==', familyIdToQuery));
    } else {
        q = query(collection(db, 'missionInstances'), where('ownerId', '==', user.uid), where('familyId', '==', null));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const instances = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
        setMissionInstances(instances);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching mission instances in real-time:", error);
        toast({ title: 'Erro ao atualizar missões', variant: 'destructive' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentContext, toast, isFamilyLoading, selectedChildId, setSelectedChildId]);

  const categoryMap = useMemo(() => new Map(missionCategories.map(cat => [cat.id, cat])), []);

  // Effect to manage filter state when switching views
  useEffect(() => {
    if (isKidsView && !['day', '3days'].includes(dateRangeFilter)) {
      setDateRangeFilter('day'); // Reset to a valid default for kids view
    }
  }, [isKidsView, dateRangeFilter]);


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

    const acc: Record<string, { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }> = {};
    const daysInView = eachDayOfInterval(viewInterval);
    
    daysInView.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        acc[dateKey] = { all: [], morning: [], afternoon: [], night: [] };
    });

    // Process Mission Instances
    instancesToProcess.forEach(instance => {
      const eventTimeSource = getDateObject(instance.isRecurring ? instance.startDate : instance.dueDate) || getDateObject(instance.startDate);
      if (!eventTimeSource) return;

      const period = getPeriodForDate(eventTimeSource);
      
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
          acc[dateKey].all.push(event);
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
                    
                    acc[dateKey][startPeriod].push(startEvent);
                    acc[dateKey][endPeriod].push(endEvent);
                    acc[dateKey].all.push(startEvent, endEvent);
                }
            });
        }
    });
    
    for (const dateKey in acc) {
      if (acc[dateKey]) {
        acc[dateKey].all.sort((a,b) => {
            const timeA = getDateObject(a.data.startDate) || new Date(0);
            const timeB = getDateObject(b.data.startDate) || new Date(0);
            return timeA.getTime() - timeB.getTime();
        });
      }
    }


    return acc;
  }, [viewInterval, missionInstances, selectedChildId, children]);
  
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
  
  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setDateRangeFilter('day');
  };

  const triggerToggleCompletion = async (missionInstance: MissionInstance, date: Date, isCompleted: boolean) => {
    if (!user) return;
    setIsProcessingAction(missionInstance.id);
    setActivePopover(null); // Close any open popovers
    try {
        const actor = { id: user.uid, name: user.name };
        if (isCompleted) {
            await reactivateMissionInstance(missionInstance.id, date, actor);
            toast({ title: 'Ação Desfeita!', description: `A conclusão de "${missionInstance.title}" foi revertida.` });
        } else {
            await completeMissionInstance(missionInstance.id, date, actor);
            toast({ title: 'Missão Cumprida!', description: `"${missionInstance.title}" foi concluída.` });
        }
        // No need to refetch, onSnapshot will handle it.
    } catch (error: any) {
        console.error("Error toggling completion:", error);
        toast({ title: 'Erro ao atualizar', description: error.message || 'Um erro inesperado ocorreu.', variant: 'destructive' });
    } finally {
        setIsProcessingAction(null);
        setConfirmingMission(null);
    }
  };
  
  const handleToggleCompletion = async (missionInstance: MissionInstance, date: Date) => {
      if (!user) return;
      const isCompleted = isMissionCompletedForDate(missionInstance, date);
  
      if (isCompleted) {
          // Undoing doesn't need confirmation
          await triggerToggleCompletion(missionInstance, date, true);
      } else {
          // Completing a mission shows the dialog
          const dismissedToday = sessionStorage.getItem('dismissCompleteMissionConfirmation');
          if (dismissedToday === 'true') {
              await triggerToggleCompletion(missionInstance, date, false);
          } else {
              setConfirmingMission({ instance: missionInstance, date: date });
          }
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
      // No need to refetch, onSnapshot will handle it.
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
          // No need to refetch, onSnapshot will handle it.
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
          // No need to refetch, onSnapshot will handle it.
      } catch (error: any) {
          console.error("Error deleting simple mission:", error);
          toast({ title: 'Erro ao Excluir', description: error.message, variant: 'destructive' });
      } finally {
          setIsProcessingAction(null);
          setInstanceToDeleteInfo(null);
      }
  };

  const formatHeaderDate = (date: Date, range: DateRangeFilter, interval: {start: Date, end: Date}) => {
    const monthFormat = isMobile ? 'MMM' : 'MMMM';
    if (range === 'day') return capitalize(format(date, `EEEE, dd 'de' MMMM 'de' yyyy`, { locale: ptBR }));
    if (range === 'month') return capitalize(format(date, `MMMM 'de' yyyy`, { locale: ptBR }));
    
    const start = interval.start;
    const end = interval.end;

    const startMonth = format(start, monthFormat, { locale: ptBR });
    const endMonth = format(end, monthFormat, { locale: ptBR });
    
    const formattedStartDate = format(start, 'd', { locale: ptBR });
    const formattedEndDate = format(end, 'd', { locale: ptBR });

    if (startMonth === endMonth) {
        return `${formattedStartDate} - ${formattedEndDate} de ${capitalize(endMonth)} de ${format(end, 'yyyy', { locale: ptBR })}`;
    } else {
        return `${formattedStartDate} de ${capitalize(startMonth)} - ${formattedEndDate} de ${capitalize(endMonth)} de ${format(end, 'yyyy', { locale: ptBR })}`;
    }
  };
  
  const hasAnyEvents = Object.values(eventsByDate).some(day => {
    const events = day as { all: any[] };
    if (!events) return false;
    return events.all.length > 0;
  });

  if (isLoading || isFamilyLoading) return <Loading />;

  const handleEditClick = (instance: MissionInstance, date: Date) => {
    setInstanceToEdit(instance);
    setOccurrenceDate(date);
    if(instance.isRecurring) {
        setIsRecurrenceEditOpen(true);
    } else {
        setRecurrenceEditMode('single');
        setIsAssignDialogOpen(true);
    }
  };

  const handleEditTemplateClick = (instance: MissionInstance) => {
    router.push(`/dashboard/missions/edit/${instance.templateId}?redirect=${encodeURIComponent(pathname + searchParams.toString())}`);
  }


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
                  <ul className={cn("space-y-1.5", isKidsView && "space-y-3")}>
                      {childEvents.map(event => {
                          const popoverId = `${event.data.id}-${format(day, 'yyyy-MM-dd')}`;
                          const isCompleted = event.type === 'mission' && isMissionCompletedForDate(event.data, day);
                          const eventTime = getDateObject(event.data.isRecurring ? event.data.startDate : event.data.dueDate) || getDateObject(event.data.startDate);
                          const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                          
                          if (event.type === 'school') {
                              return (
                                <li key={event.data.id}>
                                  <Card className="p-3 text-sm flex items-center gap-3 bg-indigo-500/10 border-l-4 border-indigo-500 shadow-sm">
                                      <div className="text-indigo-700 font-mono text-sm w-12 text-center shrink-0">{formattedTime}</div>
                                      <NotebookPen className="h-5 w-5 text-indigo-600 shrink-0" />
                                      <span className="font-semibold text-indigo-800 flex-grow">{event.title}</span>
                                  </Card>
                                </li>
                              )
                          }
                          
                          if (isKidsView) {
                            return (
                                <li key={event.data.id} data-mission-id={popoverId} className={cn(highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary ring-offset-background rounded-lg")}>
                                    <div className={cn("flex items-center gap-4 p-3 rounded-lg border-l-4 transition-all", isCompleted ? 'bg-green-500/10 border-green-500' : 'bg-muted/50 border-transparent')}>
                                      <div className="text-5xl">{event.data.emoji || '🎯'}</div>
                                      <div className="flex-grow space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-sm text-muted-foreground">{formattedTime}</p>
                                            {canEdit && (
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); handleToggleCompletion(event.data, day); }} disabled={isProcessingAction === event.data.id}>
                                                        {isProcessingAction === event.data.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-primary" />}
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleEditClick(event.data, day)}><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleEditTemplateClick(event.data)}><Edit3 className="mr-2 h-4 w-4" /> Editar Missão (Catálogo)</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleDeleteClick(event.data, day)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" /> Excluir Missão</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                             )}
                                        </div>
                                        <p className={cn("font-semibold text-lg leading-tight", isCompleted && "line-through text-muted-foreground")}>{event.title}</p>
                                        <div className="flex items-center gap-1 font-bold text-amber-600">
                                          +{event.data.starsReward} <StarIcon className="h-4 w-4 fill-current" />
                                        </div>
                                      </div>
                                    </div>
                                </li>
                            )
                          }

                          return(
                          <li key={event.data.id} data-mission-id={popoverId} className={cn("text-sm text-muted-foreground leading-snug flex justify-between items-center p-1 -m-1 rounded-md transition-all duration-300", 
                              highlightedMissionId === popoverId && "bg-accent/70 ring-2 ring-primary ring-offset-background"
                          )}>
                              <div className="flex items-center gap-2.5 flex-grow min-w-0">
                                  <span className={cn("font-semibold text-foreground/80 text-xs", isCompleted && "line-through")}>{formattedTime}</span>
                                  {event.data.emoji && <span className="text-xl">{event.data.emoji}</span>}
                                  <span className={cn("flex-1 truncate font-semibold text-foreground/80", isCompleted && "line-through")}>{event.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleToggleCompletion(event.data, day)} disabled={!canEdit || isProcessingAction === event.data.id}>
                                      {isProcessingAction === event.data.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-primary" />}
                                  </Button>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canEdit}><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="flex items-center gap-1.5 text-amber-600"><StarIcon className="h-3.5 w-3.5" /> +{event.data.starsReward}</span>
                                            </div>
                                          </DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onSelect={() => handleEditClick(event.data, day)}><Edit className="mr-2 h-4 w-4" /> Editar Agendamento</DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => handleEditTemplateClick(event.data)}><Edit3 className="mr-2 h-4 w-4" /> Editar Missão (Catálogo)</DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onSelect={() => handleDeleteClick(event.data, day)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" /> Excluir Missão</DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
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
    
    if (isMobile && (dateRangeFilter === 'week' || dateRangeFilter === 'workweek')) {
        return (
            <div className="grid grid-cols-1 gap-6">
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = (eventsByDate[dateKey] as { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { all: [], morning: [], afternoon: [], night: [] };
                    const hasEventsForDay = dayEvents.all.length > 0;
                    
                    return (
                        <div key={dateKey} className="w-full space-y-2">
                            <h2 className={cn("text-lg font-headline flex items-center gap-2 whitespace-nowrap mb-2", isToday(day) && "text-primary")}>
                                {capitalize(format(day, "EEEE, dd/MM/yy", { locale: ptBR }))}
                                {isToday(day) && <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>}
                            </h2>
                            <Card className="shadow-sm flex-1">
                                {!hasEventsForDay ? (
                                    <CardContent className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                                        Nenhuma missão.
                                    </CardContent>
                                ) : (
                                    <CardContent className="p-4 space-y-4">
                                       {renderEventListForPeriod(dayEvents.all, day)}
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    );
                })}
            </div>
        );
    }
    
    // Desktop rendering for all views
    return (
      <div className={cn(
        "grid gap-4",
        finalGridClass,
        dateRangeFilter === 'day' && selectedChildId && 'max-w-2xl mx-auto w-full'
      )}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDate[dateKey] as { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { all: [], morning: [], afternoon: [], night: [] };
          const hasEventsForDay = dayEvents.all.length > 0;
          
          return (
            <div key={dateKey} className="flex flex-col space-y-2">
              <h2 className={cn("font-headline flex items-center gap-2 whitespace-nowrap", isToday(day) && "text-primary")}>
                {capitalize(format(day, "ccc, dd/MM/yy", { locale: ptBR }))}
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
                               {timePeriodFilter === 'all' 
                                   ? renderEventListForPeriod(dayEvents.all, day)
                                   : (
                                       <>
                                           {dayEvents.morning.length > 0 && timePeriodFilter === 'morning' &&(
                                               <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>{renderEventListForPeriod(dayEvents.morning, day)}</div>
                                           )}
                                           {dayEvents.afternoon.length > 0 && timePeriodFilter === 'afternoon' &&(
                                               <div className="relative space-y-2 bg-orange-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>{renderEventListForPeriod(dayEvents.afternoon, day)}</div>
                                           )}
                                           {dayEvents.night.length > 0 && timePeriodFilter === 'night' &&(
                                               <div className="relative space-y-2 bg-indigo-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>{renderEventListForPeriod(dayEvents.night, day)}</div>
                                           )}
                                       </>
                                   )
                               }
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

  const AllHeroesDayAccordion = ({ day, events }: { day: Date, events: { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] } }) => {
    const eventsByChild = [...events.all].reduce((acc, event) => {
        if (!acc[event.data.childId]) {
            acc[event.data.childId] = { all: [], morning: [], afternoon: [], night: [] };
        }
        const period = getPeriodForDate(getDateObject(event.data.startDate) || getDateObject(event.data.dueDate)!);
        acc[event.data.childId][period].push(event);
        acc[event.data.childId].all.push(event);
        return acc;
    }, {} as Record<string, { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }>);
    
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
                                  {timePeriodFilter === 'all' 
                                    ? renderEventListForPeriod(childEvents.all, day)
                                    : (
                                        <>
                                            {childEvents.morning.length > 0 && timePeriodFilter === 'morning' &&(
                                                <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400"><Sun className="h-4 w-4 text-yellow-500" /> Manhã</h4>{renderEventListForPeriod(childEvents.morning, day)}</div>
                                            )}
                                            {childEvents.afternoon.length > 0 && timePeriodFilter === 'afternoon' &&(
                                                <div className="relative space-y-2 bg-orange-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400"><CloudSun className="h-4 w-4 text-orange-500" /> Tarde</h4>{renderEventListForPeriod(childEvents.afternoon, day)}</div>
                                            )}
                                            {childEvents.night.length > 0 && timePeriodFilter === 'night' &&(
                                                <div className="relative space-y-2 bg-indigo-500/5 p-3 rounded-lg"><h4 className="absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><Moon className="h-4 w-4 text-indigo-500" /> Noite</h4>{renderEventListForPeriod(childEvents.night, day)}</div>
                                            )}
                                        </>
                                    )
                                  }
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
              const dayEventsByPeriod = (eventsByDate[dateKey] as { all: CalendarEvent[], morning: CalendarEvent[], afternoon: CalendarEvent[], night: CalendarEvent[] }) || { all: [], morning: [], afternoon: [], night: [] };
              const dayEvents = dayEventsByPeriod.all;
              
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
                <div
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                        "h-28 sm:h-32 md:h-40 border-r border-b p-1 sm:p-2 flex flex-col items-start text-left relative group cursor-pointer",
                        !isSameMonth(day, currentDate) && "bg-muted/50 text-muted-foreground hover:bg-muted/70",
                        isToday(day) && "bg-accent/10 hover:bg-accent/20"
                    )}>
                  <div className={cn(
                      "font-semibold text-xs sm:text-sm",
                      isToday(day) && "flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground"
                  )}>{format(day, 'd')}</div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <ScrollArea className="flex-1 mt-1 w-full">
                    <ul className="space-y-1">
                      {sortedEvents.map(event => {
                        const child = childrenMap.get(event.data.childId);
                        if (!child) return null;
                        const popoverId = `${event.data.id}-${dateKey}`;
                        const isCompleted = event.type === 'mission' && isMissionCompletedForDate(event.data, day);
                        const eventTime = getDateObject(event.data.isRecurring ? event.data.startDate : event.data.dueDate) || getDateObject(event.data.startDate);
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
                                          </div>

                                      </div>
                                      <Separator/>
                                      <div className="p-2 flex flex-col gap-1">
                                          {isCompleted ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleCompletion(event.data, day)} className="justify-start"><Undo2 className="mr-2 h-4 w-4" /> Desfazer Conclusão</Button>
                                          ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleCompletion(event.data, day)} className="justify-start"><CheckSquare className="mr-2 h-4 w-4 text-green-500" /> Concluir Missão</Button>
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
  
  const renderContent = () => {
    if (isKidsView) {
        return renderGridView();
    }
    if (dateRangeFilter === 'month') {
        return renderCalendarView();
    }
    return renderGridView();
  }
  
  const dateRangeOptions = [
    { value: 'day', label: '1 Dia' },
    { value: '3days', label: '3 Dias' },
    { value: 'workweek', label: 'Semana Útil' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ];
  
  const availableDateRangeOptions = isKidsView
    ? dateRangeOptions.filter(opt => opt.value === 'day' || opt.value === '3days')
    : dateRangeOptions;
  
  return (
    <>
      <div className="hidden print:block">
        <PrintableAgenda child={childForPrint} missionInstances={missionInstances} currentDate={currentDate} />
      </div>
      <div className="space-y-6 print:hidden">
        <Card>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-grow">
              <Button variant="outline" onClick={handleToday} className="h-9 px-3 shrink-0">Hoje</Button>
              <div className="flex items-center shrink-0">
                <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Período anterior" className="h-9 w-9">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext} aria-label="Próximo período" className="h-9 w-9">
                    <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
               <h2 className="text-sm sm:text-base font-medium text-left">
                    {formatHeaderDate(currentDate, dateRangeFilter, viewInterval)}
                </h2>
            </div>
            
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-x-2 md:gap-y-2 md:flex-wrap">
              <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                <div className="flex-grow sm:flex-grow-0">
                   <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
                        <SelectTrigger className="w-full sm:w-[140px] h-9">
                            <SelectValue placeholder="Selecione a visão" />
                        </SelectTrigger>
                        <SelectContent>
                           {availableDateRangeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-grow sm:flex-grow-0">
                  <Select value={timePeriodFilter} onValueChange={(v) => setTimePeriodFilter(v as TimePeriod)}>
                      <SelectTrigger className="w-full sm:w-[130px] h-9">
                          <SelectValue placeholder="Todos os Períodos" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">
                             <span className="flex items-center gap-2">Todos os Períodos</span>
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

               <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center space-x-2">
                   <Switch id="kids-view-switch" checked={isKidsView} onCheckedChange={setIsKidsView}/>
                   <Label htmlFor="kids-view-switch" className="text-sm whitespace-nowrap flex items-center gap-1.5">Visão da Criança</Label>
                 </div>
                 <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4"/> Imprimir</Button>
                 {canEdit && (
                    <Button asChild className="flex-grow-0 sm:flex-grow-0">
                      <Link href={`/dashboard/missions/new?childId=${selectedChildId || ''}`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Missão
                      </Link>
                    </Button>
                )}
               </div>
            </div>
          </div>
        </Card>
        
        {renderContent()}
      </div>

      {confirmingMission && (
        <CompleteMissionConfirmationDialog
          isOpen={!!confirmingMission}
          onOpenChange={() => setConfirmingMission(null)}
          onConfirm={(dismiss) => {
            if (dismiss) {
              sessionStorage.setItem('dismissCompleteMissionConfirmation', 'true');
            }
            triggerToggleCompletion(confirmingMission.instance, confirmingMission.date, false);
          }}
        />
      )}
      
      <AssignMissionDialog
        template={templateToAssign}
        instanceToEdit={instanceToEdit}
        recurrenceEditMode={recurrenceEditMode}
        occurrenceDate={occurrenceDate}
        isOpen={isAssignDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTemplateToAssign(null);
            setInstanceToEdit(null);
            setRecurrenceEditMode(null);
            setOccurrenceDate(null);
          }
          setIsAssignDialogOpen(isOpen);
        }}
        onAssigned={() => {}}
        preselectedChildId={selectedChildId}
      />

       {instanceToEdit && (
        <EditRecurrenceDialog
            isOpen={isRecurrenceEditOpen}
            onOpenChange={setIsRecurrenceEditOpen}
            onSelect={(mode) => {
                setIsRecurrenceEditOpen(false);
                setRecurrenceEditMode(mode);
                setIsAssignDialogOpen(true);
            }}
            missionInstance={instanceToEdit}
            occurrenceDate={occurrenceDate}
        />
       )}

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
