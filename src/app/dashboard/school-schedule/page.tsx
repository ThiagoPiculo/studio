
"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';
import { getChildProfilesForAttribution, getSchoolScheduleForContext, deleteSchoolScheduleEntry } from '@/lib/firebase/firestore';
import type { ChildProfile, SchoolScheduleEntry, SchoolShift, Weekday } from '@/lib/types';
import { weekdays, weekdayLabels } from '@/lib/types';
import { getDayToWeekday } from '@/lib/calendar-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, User, PlusCircle, Trash2, Edit, AlertCircle, Loader2, Settings2 } from 'lucide-react';
import { EditScheduleEntryDialog } from '@/components/dashboard/school-schedule/EditScheduleEntryDialog';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Loading from './loading';
import { Timestamp } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


const subjectColors = [
    '#FCA5A5', '#FDBA74', '#FCD34D', '#A7F3D0', '#93C5FD', '#C4B5FD', '#F9A8D4'
];

function SchoolSchedulePageContent() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [scheduleEntries, setScheduleEntries] = useState<SchoolScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<SchoolScheduleEntry | null>(null);

  const [entryToDelete, setEntryToDelete] = useState<SchoolScheduleEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  const allWeekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  const [visibleWeekdays, setVisibleWeekdays] = useState<Weekday[]>(['MO', 'TU', 'WE', 'TH', 'FR']);
  const [useColors, setUseColors] = useState<boolean>(true);


  const schoolShiftMap: Record<SchoolShift, string> = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    full_time: 'Integral',
    not_applicable: 'Não se aplica'
  };
  
  const handleVisibleDaysChange = (newDays: Weekday[]) => {
    // Sort the newDays array according to the predefined order of allWeekdays
    const sortedDays = allWeekdays.filter(day => newDays.includes(day));
    setVisibleWeekdays(sortedDays);
  };

  const parseTime = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedChildren, fetchedEntries] = await Promise.all([
        getChildProfilesForAttribution(user.uid, currentContext),
        getSchoolScheduleForContext(user.uid, currentContext === 'my-space' ? null : currentContext),
      ]);
      setChildren(fetchedChildren);
      setScheduleEntries(fetchedEntries);
      if (fetchedChildren.length > 0 && !selectedChildId) {
        setSelectedChildId(fetchedChildren[0].id);
      } else if (fetchedChildren.length === 0) {
        setSelectedChildId('');
      }
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast({ title: "Erro ao carregar dados", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentContext, toast, selectedChildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const selectedChild = children.find(c => c.id === selectedChildId);
    let slots: string[] = [];

    switch (selectedChild?.schoolShift) {
        case 'morning':
            slots = Array.from({ length: 7 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7h to 13h
            break;
        case 'afternoon':
            slots = Array.from({ length: 7 }, (_, i) => `${(i + 13).toString().padStart(2, '0')}:00`); // 13h to 19h
            break;
        case 'full_time':
        case 'not_applicable':
        default:
            slots = Array.from({ length: 15 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7h to 21h
            break;
    }
    setTimeSlots(slots);
  }, [selectedChildId, children]);
  
  useEffect(() => {
    if (isMobile && scrollRef.current && visibleWeekdays.length > 0) {
      const today = new Date().getDay();
      const todayWeekday = getDayToWeekday[today];
      
      const scrollTargetDay = visibleWeekdays.includes(todayWeekday) 
        ? todayWeekday 
        : visibleWeekdays[0];

      const targetElement = scrollRef.current.querySelector(`[data-day="${scrollTargetDay}"]`);
      if (targetElement) {
        // Using a small timeout to ensure the layout is stable before scrolling
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
        }, 100);
      }
    }
  }, [isMobile, visibleWeekdays, children, selectedChildId]);

  
  const handleAddClick = () => {
    if (!selectedChildId) {
      toast({ title: "Selecione um herói", description: "Você precisa selecionar um herói para adicionar uma aula.", variant: 'default' });
      return;
    }
    setEntryToEdit(null);
    setIsDialogOpen(true);
  };
  
  const handleAddFromSlot = (day: Weekday, time: string) => {
    if (!selectedChildId || !user) return;

    const [hour, minute] = time.split(':').map(Number);
    const endHour = (hour + 1).toString().padStart(2, '0');
    const endTime = `${endHour}:${minute.toString().padStart(2, '0')}`;

    const newEntry: SchoolScheduleEntry = {
        id: '', // Empty ID signifies a new entry
        subject: '',
        dayOfWeek: day,
        startTime: time,
        endTime: endTime,
        color: subjectColors[Math.floor(Math.random() * subjectColors.length)],
        childId: selectedChildId,
        ownerId: user.uid,
        familyId: currentContext === 'my-space' ? null : currentContext,
        createdAt: new Timestamp(0,0), // Placeholder
        updatedAt: new Timestamp(0,0), // Placeholder
    };

    setEntryToEdit(newEntry);
    setIsDialogOpen(true);
  };
  
  const handleEditClick = (entry: SchoolScheduleEntry) => {
    setEntryToEdit(entry);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSchoolScheduleEntry(entryToDelete.id);
      toast({ title: "Aula removida", description: `A aula de ${entryToDelete.subject} foi removida.` });
      fetchData(); // Refetch data
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ title: "Erro ao remover aula", variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setEntryToDelete(null);
    }
  };


  const childSchedule = useMemo(() => {
    return scheduleEntries.filter(entry => entry.childId === selectedChildId);
  }, [scheduleEntries, selectedChildId]);
  
  const hasRecess = useMemo(() => {
    return scheduleEntries.some(entry => entry.childId === selectedChildId && entry.subject === 'Recreio/Intervalo');
  }, [scheduleEntries, selectedChildId]);
  
  const renderDayColumn = (day: Weekday) => {
    const todayWeekday = getDayToWeekday[new Date().getDay()];
    const isToday = day === todayWeekday;
    const topOffsetMinutes = timeSlots.length > 0 ? parseTime(timeSlots[0]) : 0;
    
    return (
      <div 
        key={day} 
        data-day={day} 
        className={cn(
            "relative border-r", 
            isMobile ? "w-36 sm:w-48 flex-shrink-0" : "flex-1",
            (day === 'SA' || day === 'SU') && "bg-muted/20"
        )}>
          {/* Clickable background slots */}
          {timeSlots.map((time, index) => (
               <div 
                  key={time} 
                  className={cn("h-12 cursor-pointer hover:bg-primary/5 transition-colors", index < timeSlots.length - 1 && "border-b")}
                  onClick={() => handleAddFromSlot(day, time)}
               ></div>
          ))}
          
          {/* Absolutely positioned entries for this day */}
          {childSchedule
              .filter(entry => entry.dayOfWeek === day)
              .map(entry => {
                  const top = ((parseTime(entry.startTime) - topOffsetMinutes) / 60) * 48;
                  const height = ((parseTime(entry.endTime) - parseTime(entry.startTime)) / 60) * 48;
                  const entryStyle: React.CSSProperties = { top: `${top}px`, height: `${height}px` };
                  
                  if (useColors) {
                      entryStyle.backgroundColor = `${entry.color}80`;
                      entryStyle.borderColor = entry.color;
                  }

                  return (
                      <div
                          key={entry.id}
                          className={cn(
                              "absolute w-full p-2 rounded-lg shadow-sm group cursor-pointer border flex items-center justify-center",
                              !useColors && "bg-primary/10 border-primary/20"
                          )}
                          style={entryStyle}
                          onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                      >
                          <p className={cn("font-bold text-sm truncate text-center", useColors ? "text-white [text-shadow:1px_1px_1px_#00000050]" : "text-primary")}>{entry.subject}</p>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button size="icon" variant="ghost" className={cn("h-6 w-6", useColors ? "text-white hover:bg-white/20" : "text-primary hover:bg-primary/20")} onClick={(e) => {e.stopPropagation(); handleEditClick(entry)}}><Edit className="h-3 w-3"/></Button>
                              <Button size="icon" variant="ghost" className={cn("h-6 w-6", useColors ? "text-white hover:bg-white/20" : "text-primary hover:bg-primary/20")} onClick={(e) => {e.stopPropagation(); setEntryToDelete(entry)}}><Trash2 className="h-3 w-3"/></Button>
                          </div>
                      </div>
                  );
              })}
      </div>
    );
  };
  
  const renderDesktopGrid = () => {
    if (timeSlots.length === 0) {
      return <div className="text-center py-10 text-muted-foreground">Selecione um herói para ver o horário.</div>;
    }
    if (visibleWeekdays.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">Selecione pelo menos um dia da semana para exibir a agenda.</div>;
    }

    const totalHeight = timeSlots.length * 48; // h-12 is 3rem = 48px

    return (
        <div className="grid grid-cols-[auto_1fr]">
            {/* Time Column */}
            <div className="text-right pr-2">
                {timeSlots.map(time => (
                    <div key={time} className="h-12 flex items-center justify-end text-xs text-muted-foreground">{time}</div>
                ))}
            </div>

            {/* Grid Content */}
            <div className="grid border-l" style={{ height: `${totalHeight}px`, gridTemplateColumns: `repeat(${visibleWeekdays.length}, minmax(0, 1fr))` }}>
                {visibleWeekdays.map(renderDayColumn)}
            </div>
        </div>
    );
  };

  const renderMobileGrid = () => {
      if (timeSlots.length === 0) {
          return <div className="text-center py-10 text-muted-foreground">Selecione um herói para ver o horário.</div>;
      }
      if (visibleWeekdays.length === 0) {
          return <div className="text-center py-10 text-muted-foreground">Selecione pelo menos um dia da semana para exibir a agenda.</div>;
      }
      const totalHeight = timeSlots.length * 48;

      return (
        <ScrollArea ref={scrollRef} className="w-full whitespace-nowrap" orientation="horizontal">
              <div className="flex" style={{ height: `${totalHeight}px`}}>
                  {/* Sticky Time Column */}
                  <div className="sticky left-0 bg-background z-10 w-14 flex-shrink-0">
                      {timeSlots.map(time => (
                          <div key={time} className="h-12 flex items-center justify-end pr-2 text-xs text-muted-foreground">{time}</div>
                      ))}
                  </div>
                  {/* Scrollable Day Columns */}
                  <div className="flex">
                      {visibleWeekdays.map(renderDayColumn)}
                  </div>
              </div>
              <ScrollBar orientation="horizontal" className="mt-2"/>
          </ScrollArea>
      )
  };
  
  const renderDayHeaders = () => {
    const todayWeekday = getDayToWeekday[new Date().getDay()];
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleWeekdays.length}, minmax(0, 1fr))` }}>
        {visibleWeekdays.map(day => (
          <div key={day} className="flex justify-center items-center gap-2">
            <h3 className="font-semibold">{weekdayLabels[day].long}</h3>
            {day === todayWeekday && <Badge variant="secondary" className="px-2 py-0.5 text-xs">Hoje</Badge>}
          </div>
        ))}
      </div>
    );
  };

  const renderMobileDayHeaders = () => {
      const todayWeekday = getDayToWeekday[new Date().getDay()];
      return (
          <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
              <div className="flex">
                  <div className="w-14 flex-shrink-0" /> 
                  <div className="flex">
                      {visibleWeekdays.map(day => (
                          <div key={day} className="w-36 sm:w-48 flex-shrink-0 flex justify-center items-center gap-2">
                              <h3 className="font-semibold">{weekdayLabels[day].long}</h3>
                              {day === todayWeekday && <Badge variant="secondary" className="px-2 py-0.5 text-xs">Hoje</Badge>}
                          </div>
                      ))}
                  </div>
              </div>
              <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
                <School className="h-8 w-8 text-primary" />
                Agenda Escolar
              </CardTitle>
              <CardDescription>
                Visualize e gerencie os horários de aula dos seus heróis.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Select value={selectedChildId} onValueChange={setSelectedChildId} disabled={children.length === 0}>
                    <SelectTrigger className="w-[240px]">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <SelectValue placeholder="Selecione um herói..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {children.map(child => (
                            <SelectItem key={child.id} value={child.id}>
                                {child.name} ({child.schoolShift ? schoolShiftMap[child.schoolShift] : 'Turno não definido'})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                              <Label className="font-semibold">Exibir Dias da Semana</Label>
                              <ToggleGroup
                                  type="multiple"
                                  variant="outline"
                                  value={visibleWeekdays}
                                  onValueChange={(value) => handleVisibleDaysChange(value as Weekday[])}
                                  className="flex flex-wrap justify-start gap-1"
                              >
                                  {allWeekdays.map(day => (
                                  <ToggleGroupItem
                                      key={day}
                                      value={day}
                                      className="h-8 w-8 p-0"
                                      aria-label={weekdayLabels[day].long}
                                  >
                                      {weekdayLabels[day].short}
                                  </ToggleGroupItem>
                                  ))}
                              </ToggleGroup>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <Label htmlFor="use-colors-switch" className="font-semibold pr-4">Usar Cores nas Matérias</Label>
                            <Switch
                                id="use-colors-switch"
                                checked={useColors}
                                onCheckedChange={setUseColors}
                            />
                           </div>
                        </div>
                    </PopoverContent>
                </Popover>
              <Button onClick={handleAddClick} disabled={!selectedChildId}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Aula
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className={cn("grid items-end p-4 pb-2", !isMobile && "grid-cols-[auto_1fr]")}>
            {!isMobile ? (
              <>
                <div className="pr-2">{/* Empty cell for time column */}</div>
                {renderDayHeaders()}
              </>
            ) : (
                renderMobileDayHeaders()
            )}
        </CardHeader>
        <CardContent className="p-4 pt-0 overflow-x-auto">
          {children.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="font-semibold">Nenhum herói encontrado.</p>
              <p>Você precisa cadastrar um herói antes de montar a agenda escolar.</p>
            </div>
          ) : !selectedChildId ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Selecione um herói para ver ou editar a agenda.</p>
            </div>
          ) : (
            isMobile ? renderMobileGrid() : renderDesktopGrid()
          )}
        </CardContent>
      </Card>
      
      {isDialogOpen && (
        <EditScheduleEntryDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={fetchData}
          entryToEdit={entryToEdit}
          childId={selectedChildId}
          showRecessHint={!hasRecess}
        />
      )}

      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Aula?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a aula de "{entryToDelete.subject}" do horário?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Sim, Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}


export default function SchoolSchedulePage() {
    return (
        <Suspense fallback={<Loading />}>
            <SchoolSchedulePageContent />
        </Suspense>
    )
}


    