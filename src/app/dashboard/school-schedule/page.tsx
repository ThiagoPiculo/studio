
"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';
import { getChildProfilesForAttribution, getSchoolScheduleForContext, deleteSchoolScheduleEntry } from '@/lib/firebase/firestore';
import type { ChildProfile, SchoolScheduleEntry } from '@/lib/types';
import { weekdays, weekdayLabels } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, User, PlusCircle, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react';
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
import Loading from './loading';


function SchoolSchedulePageContent() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [scheduleEntries, setScheduleEntries] = useState<SchoolScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<SchoolScheduleEntry | null>(null);

  const [entryToDelete, setEntryToDelete] = useState<SchoolScheduleEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeSlots = Array.from({ length: 15 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7 AM to 9 PM

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
  
  const handleAddClick = () => {
    if (!selectedChildId) {
      toast({ title: "Selecione um herói", description: "Você precisa selecionar um herói para adicionar uma aula.", variant: 'default' });
      return;
    }
    setEntryToEdit(null);
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
  
  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const renderScheduleGrid = () => {
    return (
        <div className="relative grid grid-cols-[auto_1fr] h-full">
            {/* Time Column */}
            <div className="text-right pr-2">
                {timeSlots.map(time => (
                    <div key={time} className="h-12 flex items-center justify-end text-xs text-muted-foreground">{time}</div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 relative border-l">
                {/* Background Lines */}
                {timeSlots.map(time => (
                    <div key={time} className="col-span-7 h-12 border-b" />
                ))}

                {/* Entries */}
                {weekdays.map((day, dayIndex) => (
                    <div key={day} className="absolute inset-0 grid grid-cols-7">
                        <div className="col-start-1 h-full" style={{gridColumnStart: dayIndex + 1}}>
                            {childSchedule
                                .filter(entry => entry.dayOfWeek === day)
                                .map(entry => {
                                    const top = ((parseTime(entry.startTime) - parseTime(timeSlots[0])) / 60) * 48; // 48px = 12 * 4rem
                                    const height = ((parseTime(entry.endTime) - parseTime(entry.startTime)) / 60) * 48;

                                    return (
                                        <div
                                            key={entry.id}
                                            className="absolute w-full p-2 rounded-lg shadow-sm group cursor-pointer"
                                            style={{
                                                top: `${top}px`,
                                                height: `${height}px`,
                                                backgroundColor: `${entry.color}80`, // with transparency
                                                borderColor: entry.color,
                                                borderWidth: '1px'
                                            }}
                                            onClick={() => handleEditClick(entry)}
                                        >
                                            <p className="font-bold text-sm text-white [text-shadow:1px_1px_1px_#00000050] truncate">{entry.subject}</p>
                                            <p className="text-xs text-white/90 [text-shadow:1px_1px_1px_#00000050]">{entry.startTime} - {entry.endTime}</p>
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={(e) => {e.stopPropagation(); handleEditClick(entry)}}><Edit className="h-3 w-3"/></Button>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={(e) => {e.stopPropagation(); setEntryToDelete(entry)}}><Trash2 className="h-3 w-3"/></Button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
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
            <div className="flex items-center gap-2">
                <Select value={selectedChildId} onValueChange={setSelectedChildId} disabled={children.length === 0}>
                    <SelectTrigger className="w-[200px]">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <SelectValue placeholder="Selecione um herói..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {children.map(child => (
                            <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              <Button onClick={handleAddClick} disabled={!selectedChildId}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Aula
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="grid grid-cols-[auto_1fr] items-end p-4">
            <div>{/* Empty cell for time column */}</div>
            <div className="grid grid-cols-7 text-center">
                {weekdays.map(day => <h3 key={day} className="font-semibold">{weekdayLabels[day].long}</h3>)}
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
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
            <div className="h-[720px] overflow-y-auto">
                {renderScheduleGrid()}
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
