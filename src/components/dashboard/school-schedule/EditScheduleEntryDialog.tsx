
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Info } from 'lucide-react';
import type { ChildProfile, SchoolScheduleEntry, Weekday } from '@/lib/types';
import { weekdays, weekdayLabels } from '@/lib/types';
import { addSchoolScheduleEntry, updateSchoolScheduleEntry, addRecurringSchoolEntry, getChildProfileById } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TimePicker } from './TimePicker';

const scheduleEntrySchema = z.object({
  subject: z.string().min(2, { message: "O nome da matéria deve ter pelo menos 2 caracteres." }),
  dayOfWeek: z.enum(weekdays),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use o formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use o formato HH:mm."),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida."),
}).refine(data => data.startTime < data.endTime, {
  message: "O horário final deve ser depois do inicial.",
  path: ["endTime"],
});

type FormValues = z.infer<typeof scheduleEntrySchema>;

const subjectColors = [
    '#FCA5A5', '#FDBA74', '#FCD34D', '#A7F3D0', '#93C5FD', '#C4B5FD', '#F9A8D4', '#868e96'
];

const schoolSubjects = [
    "Recreio/Intervalo",
    "Português", "Matemática", "Ciências", "História", "Geografia", "Inglês", 
    "Educação Física", "Artes", "Música", "Redação", "Espanhol", "Informática",
    "Filosofia", "Sociologia", "Química", "Física", "Biologia"
];

interface EditScheduleEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  entryToEdit?: SchoolScheduleEntry | null;
  childId: string;
  showRecessHint?: boolean;
}

export function EditScheduleEntryDialog({ isOpen, onOpenChange, onSave, entryToEdit, childId, showRecessHint = false }: EditScheduleEntryDialogProps) {
    const { user } = useAuth();
    const { currentContext } = useFamily();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [child, setChild] = useState<ChildProfile | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(scheduleEntrySchema),
        defaultValues: {
            subject: '',
            dayOfWeek: 'MO',
            startTime: '08:00',
            endTime: '09:00',
            color: subjectColors[0],
        }
    });
    
    useEffect(() => {
        if (isOpen && childId) {
            getChildProfileById(childId).then(setChild);
        }
    }, [isOpen, childId]);

    const watchedSubject = form.watch('subject');

    useEffect(() => {
        if (watchedSubject === 'Recreio/Intervalo') {
            form.setValue('color', '#868e96');
        }
    }, [watchedSubject, form]);

    useEffect(() => {
        if (entryToEdit) {
            form.reset({
                subject: entryToEdit.subject,
                dayOfWeek: entryToEdit.dayOfWeek,
                startTime: entryToEdit.startTime,
                endTime: entryToEdit.endTime,
                color: entryToEdit.subject === 'Recreio/Intervalo' ? '#868e96' : entryToEdit.color,
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
                color: subjectColors[Math.floor(Math.random() * subjectColors.length)],
            });
        }
    }, [entryToEdit, form, child]);

    const onSubmit = async (data: FormValues) => {
        if (!user || !childId) {
            toast({ title: 'Erro de autenticação ou dados.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        try {
            const isWeekday = ['MO', 'TU', 'WE', 'TH', 'FR'].includes(data.dayOfWeek);
            const isCreatingNewRecess = data.subject === 'Recreio/Intervalo' && !(entryToEdit && entryToEdit.id);
            
            // Central payload preparation
            const payload = { ...data };
            if (payload.subject === 'Recreio/Intervalo') {
                payload.color = '#868e96';
            }

            if (isCreatingNewRecess && isWeekday) {
                // Create recurring recess for the week
                const daysToRepeat: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
                const baseEntry = {
                    subject: payload.subject,
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                    color: payload.color,
                    childId,
                    ownerId: user.uid,
                    familyId: currentContext === 'my-space' ? null : currentContext,
                };
                await addRecurringSchoolEntry(baseEntry, daysToRepeat);
                toast({ title: 'Intervalo adicionado!', description: `O intervalo foi adicionado de Segunda a Sexta.` });
            } else if (entryToEdit && entryToEdit.id) {
                // Update existing entry (of any kind)
                await updateSchoolScheduleEntry(entryToEdit.id, payload);
                toast({ title: 'Aula atualizada!', description: `A aula de ${payload.subject} foi atualizada no horário.` });
            } else {
                // Create a single new entry (for regular classes or weekend recess)
                const newEntryData = {
                    ...payload,
                    childId,
                    ownerId: user.uid,
                    familyId: currentContext === 'my-space' ? null : currentContext,
                };
                await addSchoolScheduleEntry(newEntryData);
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{entryToEdit && entryToEdit.id ? 'Editar Aula' : 'Adicionar Nova Aula'}</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes da aula para o horário escolar.
                    </DialogDescription>
                </DialogHeader>

                {showRecessHint && !entryToEdit && (
                    <Alert variant="default" className="mt-4 border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="font-semibold text-primary">Dica de Mestre!</AlertTitle>
                        <AlertDescription className="text-primary/90">
                            Comece cadastrando o "Recreio/Intervalo" em um dia útil. Isso adicionará o intervalo para toda a semana de uma só vez!
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="subject" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Matéria</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Matemática" {...field} list="subjects-list" />
                                </FormControl>
                                <datalist id="subjects-list">
                                    {schoolSubjects.map(subject => <option key={subject} value={subject} />)}
                                </datalist>
                                {form.watch('subject') === 'Recreio/Intervalo' && (
                                    <FormDescription>
                                        Selecione um dia útil para adicionar o intervalo na semana toda.
                                    </FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dia da Semana</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {weekdays.map(day => (
                                                <SelectItem key={day} value={day}>{weekdayLabels[day].long}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cor</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={form.watch('subject') === 'Recreio/Intervalo'}>
                                        <FormControl><SelectTrigger style={{backgroundColor: field.value}}><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {subjectColors.map(color => (
                                                <SelectItem key={color} value={color}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 rounded-full" style={{backgroundColor: color}}></div>
                                                        {color}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início</FormLabel>
                                    <FormControl><TimePicker {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim</FormLabel>
                                    <FormControl><TimePicker {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
