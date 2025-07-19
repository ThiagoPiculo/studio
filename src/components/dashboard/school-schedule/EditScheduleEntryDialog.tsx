
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Info, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import type { ChildProfile, SchoolScheduleEntry, Weekday } from '@/lib/types';
import { schoolSubjects, allWeekdays, weekdayLabels } from '@/lib/types';
import { addSchoolScheduleEntry, updateSchoolScheduleEntry, addRecurringSchoolEntry } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TimePicker } from './TimePicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { heroColors } from '@/lib/hero-colors';
import { ScrollArea } from '@/components/ui/scroll-area';


const scheduleEntrySchema = z.object({
  subject: z.string().min(2, { message: "O nome da matéria deve ter pelo menos 2 caracteres." }),
  dayOfWeek: z.enum(allWeekdays),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use o formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use o formato HH:mm."),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida."),
}).refine(data => data.startTime < data.endTime, {
  message: "O horário final deve ser depois do inicial.",
  path: ["endTime"],
});

type FormValues = z.infer<typeof scheduleEntrySchema>;

const orderedSubjects = [
  ...schoolSubjects.filter(s => s.label === "Recreio/Intervalo"),
  ...schoolSubjects.filter(s => s.label !== "Recreio/Intervalo").sort((a, b) => a.label.localeCompare(b.label))
];

interface EditScheduleEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  entryToEdit?: SchoolScheduleEntry | null;
  child: ChildProfile | null;
  showRecessHint?: boolean;
  onDelete: () => void;
}

export function EditScheduleEntryDialog({ isOpen, onOpenChange, onSave, entryToEdit, child, showRecessHint = false, onDelete }: EditScheduleEntryDialogProps) {
    const { user } = useAuth();
    const { currentContext } = useFamily();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [subjectInputValue, setSubjectInputValue] = useState("");


    const form = useForm<FormValues>({
        resolver: zodResolver(scheduleEntrySchema),
        defaultValues: {
            subject: '',
            dayOfWeek: 'MO',
            startTime: '08:00',
            endTime: '09:00',
            color: '#93C5FD',
        }
    });

    useEffect(() => {
        if (entryToEdit) {
            form.reset({
                subject: entryToEdit.subject,
                dayOfWeek: entryToEdit.dayOfWeek,
                startTime: entryToEdit.startTime,
                endTime: entryToEdit.endTime,
                color: entryToEdit.color,
            });
        } else {
             const defaultStartTime = child?.schoolShiftStart || '08:00';
             const [startHourStr, startMinuteStr] = defaultStartTime.split(':');
             const startHour = parseInt(startHourStr, 10);
             const endHour = startHour + 1;
             const defaultEndTime = `${endHour.toString().padStart(2, '0')}:${startMinuteStr}`;

            form.reset({
                subject: '',
                dayOfWeek: 'MO',
                startTime: defaultStartTime,
                endTime: defaultEndTime,
                color: schoolSubjects.find(s => s.label === "Português")?.color || '#93C5FD',
            });
        }
    }, [entryToEdit, form, child]);

    const onSubmit = async (data: FormValues) => {
        if (!user || !child) {
            toast({ title: 'Erro de autenticação ou dados.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        try {
            const isWeekday = ['MO', 'TU', 'WE', 'TH', 'FR'].includes(data.dayOfWeek);
            const isCreatingNewRecess = data.subject === 'Recreio/Intervalo' && !(entryToEdit && entryToEdit.id);
            
            const payload = { ...data };

            if (isCreatingNewRecess && isWeekday) {
                const daysToRepeat: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
                const baseEntry = {
                    subject: payload.subject,
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                    color: payload.color,
                    childId: child.id,
                    ownerId: child.ownerId,
                    familyId: currentContext === 'my-space' ? null : currentContext,
                };
                await addRecurringSchoolEntry(baseEntry, daysToRepeat, user);
                toast({ title: 'Intervalo adicionado!', description: `O intervalo foi adicionado de Segunda a Sexta.` });
            } else if (entryToEdit && entryToEdit.id) {
                await updateSchoolScheduleEntry(entryToEdit.id, payload, user);
                toast({ title: 'Aula atualizada!', description: `A aula de ${payload.subject} foi atualizada no horário.` });
            } else {
                const newEntryData = {
                    ...payload,
                    childId: child.id,
                    ownerId: user.uid,
                    familyId: currentContext === 'my-space' ? null : currentContext,
                    createdAt: new Timestamp(0,0), // Will be replaced by server
                    updatedAt: new Timestamp(0,0), // Will be replaced by server
                };
                await addSchoolScheduleEntry(newEntryData, user);
                toast({ title: 'Nova aula adicionada!', description: `A aula de ${payload.subject} foi adicionada ao horário.` });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving schedule entry', error);
            toast({ title: 'Erro ao salvar', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const { minHour, maxHour } = useMemo(() => {
        if (child && child.schoolShiftStart && child.schoolShiftEnd && child.schoolShift !== 'not_applicable') {
            return {
                minHour: parseInt(child.schoolShiftStart.split(':')[0], 10),
                maxHour: parseInt(child.schoolShiftEnd.split(':')[0], 10)
            };
        }
        return { minHour: undefined, maxHour: undefined };
    }, [child]);


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <ScrollArea className="max-h-[85vh]">
                    <div className="p-1">
                        <DialogHeader className="px-6 pt-6">
                            <DialogTitle>{entryToEdit && entryToEdit.id ? 'Editar Aula' : 'Adicionar Nova Aula'}</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da aula para o horário escolar de {child?.name}.
                            </DialogDescription>
                        </DialogHeader>

                        {showRecessHint && !entryToEdit && (
                            <div className="px-6 pt-4">
                                <Alert variant="default" className="border-primary/20 bg-primary/5">
                                    <Info className="mr-2 h-4 w-4 text-primary" />
                                    <AlertTitle className="font-semibold text-primary">Dica de Mestre!</AlertTitle>
                                    <AlertDescription className="text-primary/90">
                                        Comece cadastrando o "Recreio/Intervalo". Isso adicionará o intervalo para toda a semana de uma só vez!
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 px-6 pb-6">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Matéria</FormLabel>
                                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                          variant="outline"
                                                          role="combobox"
                                                          className={cn("w-full justify-between font-semibold", !field.value && "text-muted-foreground")}
                                                          style={field.value ? { backgroundColor: `${form.getValues('color')}BF`, borderColor: form.getValues('color'), color: 'white' } : {}}
                                                        >
                                                            {field.value ? field.value : "Selecione ou digite uma matéria..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput 
                                                            placeholder="Buscar matéria..."
                                                            value={subjectInputValue}
                                                            onValueChange={setSubjectInputValue}
                                                        />
                                                        <CommandList>
                                                            <CommandEmpty>Nenhuma matéria encontrada.</CommandEmpty>
                                                            <CommandGroup>
                                                                {orderedSubjects.map((subject) => (
                                                                    <CommandItem
                                                                        value={subject.label}
                                                                        key={subject.label}
                                                                        onSelect={() => {
                                                                            form.setValue("subject", subject.label);
                                                                            form.setValue("color", subject.color);
                                                                            setSubjectInputValue("");
                                                                            setIsPopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", field.value === subject.label ? "opacity-100" : "opacity-0")} />
                                                                        {subject.label}
                                                                    </CommandItem>
                                                                ))}
                                                                {subjectInputValue && !orderedSubjects.some(s => s.label.toLowerCase() === subjectInputValue.toLowerCase()) && (
                                                                     <CommandItem
                                                                        value={subjectInputValue}
                                                                        onSelect={() => {
                                                                            form.setValue("subject", subjectInputValue);
                                                                            const usedColors = orderedSubjects.map(s => s.color);
                                                                            const availableColors = heroColors.filter(c => !usedColors.includes(c as any));
                                                                            const randomColor = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : heroColors[Math.floor(Math.random() * heroColors.length)];
                                                                            form.setValue("color", randomColor);
                                                                            setSubjectInputValue("");
                                                                            setIsPopoverOpen(false);
                                                                        }}
                                                                      >
                                                                         <Check className="mr-2 h-4 w-4 opacity-0" />
                                                                         Criar: "{subjectInputValue}"
                                                                      </CommandItem>
                                                                )}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {form.watch('subject') === 'Recreio/Intervalo' && (
                                                <FormDescription>Selecione um dia útil para adicionar o intervalo na semana toda.</FormDescription>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dayOfWeek"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dia da Semana</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {allWeekdays.map(day => (
                                                    <SelectItem key={day} value={day}>{weekdayLabels[day].long}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="startTime" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Início</FormLabel>
                                            <FormControl><TimePicker {...field} minHour={minHour} maxHour={maxHour} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="endTime" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fim</FormLabel>
                                            <FormControl><TimePicker {...field} minHour={minHour} maxHour={maxHour} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full pt-4">
                                   <div>
                                    {entryToEdit && entryToEdit.id && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Aula?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tem certeza que deseja remover a aula de "{entryToEdit.subject}" do horário?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                                                        Sim, Excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                   </div>
                                   <div className="flex flex-col-reverse sm:flex-row sm:space-x-2 gap-2 sm:gap-0">
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={isProcessing}>
                                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar
                                        </Button>
                                   </div>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
