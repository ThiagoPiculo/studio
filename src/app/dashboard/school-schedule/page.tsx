
"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';
import { getChildProfilesForAttribution, getSchoolScheduleForContext, deleteSchoolScheduleEntry } from '@/lib/firebase/firestore';
import type { ChildProfile, SchoolScheduleEntry, SchoolShift, Weekday } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { getDayToWeekday, parseTime } from '@/lib/calendar-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, User, PlusCircle, Trash2, Edit, AlertCircle, Loader2, Settings2, Clock } from 'lucide-react';
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

  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);


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
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast({ title: "Erro ao carregar dados", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentContext, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if (isLoading) return;

    if (!selectedChildId && children.length > 0) {
        setSelectedChildId(children[0].id);
    }
    else if (selectedChildId && !children.find(c => c.id === selectedChildId)) {
        setSelectedChildId(children.length > 0 ? children[0].id : '');
    }
  }, [children, selectedChildId, isLoading]);

  useEffect(() => {
    let slots: string[] = [];
    const child = children.find(c => c.id === selectedChildId);

    let startHour = 7;
    let endHour = 19;
    
    if (child?.schoolShiftStart && child?.schoolShiftEnd) {
        startHour = parseInt(child.schoolShiftStart.split(':')[0], 10);
        const endHourRaw = parseInt(child.schoolShiftEnd.split(':')[0], 10);
        const endMinutesRaw = parseInt(child.schoolShiftEnd.split(':')[1], 10);
        endHour = endMinutesRaw > 0 ? endHourRaw + 1 : endHourRaw;
    } else {
        switch (child?.schoolShift) {
            case 'morning': startHour = 7; endHour = 13; break;
            case 'afternoon': startHour = 13; endHour = 19; break;
            case 'full_time': case 'not_applicable': default: startHour = 7; endHour = 21; break;
        }
    }
    
    slots = Array.from({ length: endHour - startHour }, (_, i) => `${(i + startHour).toString().padStart(2, '0')}:00`);
    setTimeSlots(slots);
  }, [selectedChildId, children]);
  
  useEffect(() => {
    if (isMobile && scrollRef.current && visibleWeekdays.length > 0) {
      const today = new Date().getDay();
      const todayWeekday = getDayToWeekday[today];
      const scrollTargetDay = visibleWeekdays.includes(todayWeekday) ? todayWeekday : visibleWeekdays[0];
      const targetElement = scrollRef.current.querySelector(`[data-day="${scrollTargetDay}"]`);
      if (targetElement) {
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
        id: '',
        subject: '',
        dayOfWeek: day,
        startTime: time,
        endTime: endTime,
        color: subjectColors[Math.floor(Math.random() * subjectColors.length)],
        childId: selectedChildId,
        ownerId: user.uid,
        familyId: currentContext === 'my-space' ? null : currentContext,
        createdAt: new Timestamp(0,0),
        updatedAt: new Timestamp(0,0),
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
      fetchData();
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

  const DayColumnContent = ({ day }: { day: Weekday }) => {
    const topOffsetMinutes = timeSlots.length > 0 ? parseTime(timeSlots[0]) : 0;
    
    return (
        <div className={cn("relative h-full", (day === 'SA' || day === 'SU') && "bg-muted/20")}>
            {timeSlots.map((time, index) => (
                <div 
                    key={time} 
                    className={cn(
                        "h-12 cursor-pointer hover:bg-primary/5 transition-colors", 
                        index < timeSlots.length - 1 && "border-b"
                    )}
                    onClick={() => handleAddFromSlot(day, time)}
                ></div>
            ))}
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
            <div className="flex flex-wrap items-center gap-2 justify-end">
                <Select value={selectedChildId} onValueChange={setSelectedChildId} disabled={children.length === 0}>
                    <SelectTrigger className="w-full sm:w-[240px]">
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
                          {selectedChildId && <Separator />}
                          {selectedChildId && (
                              <div className="space-y-2">
                                  <Label className="font-semibold">Turno Escolar</Label>
                                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                                      <Link href={`/dashboard/child/${selectedChildId}/manage?tab=edit`}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar Turno do Herói
                                      </Link>
                                  </Button>
                              </div>
                          )}
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
        <CardContent className="overflow-x-auto p-0">
          {children.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground p-4">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="font-semibold">Nenhum herói encontrado.</p>
              <p>Você precisa cadastrar um herói antes de montar a agenda escolar.</p>
            </div>
          ) : !selectedChildId ? (
            <div className="text-center py-10 text-muted-foreground p-4">
              <p>Selecione um herói para ver ou editar a agenda.</p>
            </div>
          ) : isMobile ? (
             <div className="flex w-full">
                <div className="sticky left-0 z-10 flex w-14 flex-shrink-0 flex-col bg-background shadow-md">
                    <div className="flex h-12 items-center justify-center border-b border-r font-semibold"><Clock className="h-4 w-4" /></div>
                    {timeSlots.map(time => (
                        <div key={time} className="flex h-12 items-center justify-end border-r pr-2 text-xs text-muted-foreground">
                            {time}
                        </div>
                    ))}
                </div>
                <ScrollArea className="flex-1" orientation="horizontal" ref={scrollRef}>
                    <div className="flex flex-col">
                        <div className="sticky top-0 z-10 flex h-12 bg-background">
                            {visibleWeekdays.map(day => (
                                <div key={day} className="flex w-36 flex-shrink-0 items-center justify-center gap-2 border-b border-r font-semibold sm:w-48">
                                    <h3>{weekdayLabels[day].short}</h3>
                                    {day === getDayToWeekday[new Date().getDay()] && <Badge variant="secondary">Hoje</Badge>}
                                </div>
                            ))}
                        </div>
                        <div className="flex" style={{ height: `${timeSlots.length * 48}px` }}>
                             {visibleWeekdays.map(day => (
                                <div key={day} data-day={day} className="w-36 flex-shrink-0 border-r sm:w-48">
                                    <DayColumnContent day={day} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
             </div>
          ) : (
            <div className="p-4">
                <div className="grid grid-cols-[auto_1fr] border-b">
                    <div className="pr-2" />
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleWeekdays.length}, minmax(0, 1fr))` }}>
                        {visibleWeekdays.map(day => (
                            <div key={day} className="flex justify-center items-center gap-2 py-2">
                                <h3 className="font-semibold">{weekdayLabels[day].short}</h3>
                                {day === getDayToWeekday[new Date().getDay()] && <Badge variant="secondary" className="px-2 py-0.5 text-xs">Hoje</Badge>}
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="grid grid-cols-[auto_1fr]">
                    <div className="text-right pr-2">
                        {timeSlots.map(time => (
                            <div key={time} className="h-12 flex items-center justify-end text-xs text-muted-foreground">{time}</div>
                        ))}
                    </div>
                    <div className="grid border-l" style={{ gridTemplateColumns: `repeat(${visibleWeekdays.length}, minmax(0, 1fr))` }}>
                        {visibleWeekdays.map(day => (
                            <div key={day} data-day={day} className="flex-1 border-r">
                                <DayColumnContent day={day} />
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
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
