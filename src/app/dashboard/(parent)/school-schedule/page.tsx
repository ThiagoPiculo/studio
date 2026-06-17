
"use client";

import { Suspense, useEffect, useState, useMemo } from 'react';
import Loading from './loading';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { ChildProfile, SchoolScheduleEntry, Weekday } from '@/lib/types';
import { getSchoolScheduleForContext, deleteSchoolScheduleEntry } from '@/lib/supabase/db';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, Edit, Trash2, Info, Loader2, Filter } from 'lucide-react';
import { allWeekdays, weekdayLabels } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { EditScheduleEntryDialog } from '@/components/dashboard/school-schedule/EditScheduleEntryDialog';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';


function SchoolSchedulePageContent() {
    const { user, loading: authLoading } = useAuth();
    const { currentContext, childrenInContext, isLoading: isFamilyLoading, selectedChildId } = useFamily();
    
    const [scheduleEntries, setScheduleEntries] = useState<SchoolScheduleEntry[]>([]);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<SchoolScheduleEntry | null>(null);
    const [selectedChildForNewEntry, setSelectedChildForNewEntry] = useState<ChildProfile | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<SchoolScheduleEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    
    const [selectedDays, setSelectedDays] = useState<Weekday[]>(['MO', 'TU', 'WE', 'TH', 'FR']);
    const [showColors, setShowColors] = useState<boolean>(true);


    const fetchData = async () => {
        if (!user) {
            setIsLoadingSchedule(false);
            return;
        }
        setIsLoadingSchedule(true);
        try {
            const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
            const entries = await getSchoolScheduleForContext(user.uid, familyIdToQuery);
            setScheduleEntries(entries);
        } catch (error) {
            console.error("Error fetching school schedules:", error);
        } finally {
            setIsLoadingSchedule(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [user, currentContext]);


    const scheduleByChildAndDay = useMemo(() => {
        const grouped: Record<string, Record<string, SchoolScheduleEntry[]>> = {};
        childrenInContext.forEach(child => {
            grouped[child.id] = {};
            scheduleEntries
                .filter(entry => entry.childId === child.id)
                .forEach(entry => {
                    if (!grouped[child.id][entry.dayOfWeek]) {
                        grouped[child.id][entry.dayOfWeek] = [];
                    }
                    grouped[child.id][entry.dayOfWeek].push(entry);
                });
            // Sort entries within each day by start time
            Object.keys(grouped[child.id]).forEach(day => {
                grouped[child.id][day].sort((a, b) => a.startTime.localeCompare(b.startTime));
            });
        });
        return grouped;
    }, [childrenInContext, scheduleEntries]);
    
    const hasAnySchedule = scheduleEntries.length > 0;
    
    const handleEditEntry = (entry: SchoolScheduleEntry) => {
        setEntryToEdit(entry);
        setIsEntryDialogOpen(true);
    };

    const handleAddEntry = (child: ChildProfile) => {
        setSelectedChildForNewEntry(child);
        setEntryToEdit(null);
        setIsEntryDialogOpen(true);
    };
    
    const handleDeleteEntry = async () => {
        if (!entryToDelete || !user) return;
        setIsDeleting(true);
        try {
            await deleteSchoolScheduleEntry(entryToDelete.id, user);
            toast({ title: "Aula removida", description: `A aula de ${entryToDelete.subject} foi removida.` });
            fetchData(); // Refetch
        } catch (error) {
            console.error("Error deleting school schedule entry:", error);
            toast({ title: "Erro ao remover aula", variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setEntryToDelete(null);
        }
    };
    
    const visibleDays = useMemo(() => {
        return allWeekdays.filter(day => selectedDays.includes(day));
    }, [selectedDays]);

    const childrenToDisplay = useMemo(() => {
        if (!selectedChildId) return childrenInContext;
        return childrenInContext.filter(child => child.id === selectedChildId);
    }, [childrenInContext, selectedChildId]);


    if (authLoading || isFamilyLoading || isLoadingSchedule) {
        return <Loading />;
    }

    if (childrenInContext.length === 0) {
        return (
            <GettingStartedGuide 
                hasChildren={false}
                hasMissions={false} 
                hasRewards={false}
            />
        )
    }

    return (
        <div className="space-y-6">
            {!isLoadingSchedule && !hasAnySchedule && (
                 <Alert variant="default" className="border-primary/20 bg-primary/5">
                    <Info className="mr-2 h-4 w-4 text-primary" />
                    <AlertTitle className="font-semibold text-primary">Comece pela Agenda Escolar!</AlertTitle>
                    <AlertDescription className="text-primary/90">
                        Cadastrar os horários de aula ajuda o assistente a sugerir os melhores momentos para as missões, evitando conflitos.
                        <br/>
                        <strong>Dica:</strong> comece adicionando o "Recreio/Intervalo" e ele será replicado para todos os dias úteis!
                    </AlertDescription>
                </Alert>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> Filtros de Visualização</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
                    <div className="space-y-2">
                        <Label>Dias da Semana</Label>
                        <ToggleGroup type="multiple" value={selectedDays} onValueChange={(v) => setSelectedDays(v as Weekday[])} variant="outline" className="flex-wrap justify-start">
                            {allWeekdays.map(day => (
                                <ToggleGroupItem key={day} value={day} aria-label={weekdayLabels[day].long} className="h-9 px-3">
                                    {weekdayLabels[day].short}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch id="color-switch" checked={showColors} onCheckedChange={setShowColors} />
                        <Label htmlFor="color-switch">Exibir Cores</Label>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-8">
                {childrenToDisplay.map(child => (
                    <Card key={child.id} className="shadow-md">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        className="h-12 w-12 text-lg ring-2 ring-offset-background ring-[var(--ring-color)]"
                                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                    >
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback style={{backgroundColor: child.color}}>
                                            {getInitials(child.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <CardTitle>{child.name}</CardTitle>
                                </div>
                                 <Button size="sm" onClick={() => handleAddEntry(child)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Aula
                                 </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <div className={cn(
                                    "grid gap-4 min-w-[700px] md:min-w-full",
                                    `grid-cols-${visibleDays.length || 1}`
                                )}>
                                    {visibleDays.map(day => (
                                        <div key={day} className="space-y-3 p-2 rounded-lg bg-muted/30">
                                            <h3 className="font-semibold text-center">{weekdayLabels[day].long}</h3>
                                            <div className="space-y-2">
                                                {(scheduleByChildAndDay[child.id]?.[day] || []).length > 0 ? (
                                                    scheduleByChildAndDay[child.id][day].map(entry => (
                                                        <div key={entry.id} className="group p-2 rounded-md" style={showColors ? { backgroundColor: `${entry.color}30`, borderLeft: `4px solid ${entry.color}` } : { borderLeft: `4px solid hsl(var(--border))`}}>
                                                            <div className="flex justify-between items-start">
                                                                <p className="font-semibold text-sm">{entry.subject}</p>
                                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditEntry(entry)}><Edit className="h-4 w-4" /></Button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setEntryToDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{entry.startTime} - {entry.endTime}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center text-xs text-muted-foreground pt-4">Sem aulas</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <EditScheduleEntryDialog
              isOpen={isEntryDialogOpen}
              onOpenChange={setIsEntryDialogOpen}
              onSave={fetchData}
              entryToEdit={entryToEdit}
              child={entryToEdit ? childrenInContext.find(c => c.id === entryToEdit.childId) || null : selectedChildForNewEntry}
              showRecessHint={!hasAnySchedule}
              onDelete={() => {
                if(entryToEdit) setEntryToDelete(entryToEdit);
                setIsEntryDialogOpen(false);
              }}
            />

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
                            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
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
