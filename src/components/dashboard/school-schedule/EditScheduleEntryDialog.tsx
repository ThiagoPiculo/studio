
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { SchoolScheduleEntry } from '@/lib/types';
import { weekdays, weekdayLabels } from '@/lib/types';
import { addSchoolScheduleEntry, updateSchoolScheduleEntry } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';

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
    '#FCA5A5', '#FDBA74', '#FCD34D', '#A7F3D0', '#93C5FD', '#C4B5FD', '#F9A8D4'
];

const schoolSubjects = [
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
}

export function EditScheduleEntryDialog({ isOpen, onOpenChange, onSave, entryToEdit, childId }: EditScheduleEntryDialogProps) {
    const { user } = useAuth();
    const { currentContext } = useFamily();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

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
        if (entryToEdit) {
            form.reset({
                subject: entryToEdit.subject,
                dayOfWeek: entryToEdit.dayOfWeek,
                startTime: entryToEdit.startTime,
                endTime: entryToEdit.endTime,
                color: entryToEdit.color,
            });
        } else {
            form.reset({
                subject: '',
                dayOfWeek: 'MO',
                startTime: '08:00',
                endTime: '09:00',
                color: subjectColors[Math.floor(Math.random() * subjectColors.length)],
            });
        }
    }, [entryToEdit, form]);

    const onSubmit = async (data: FormValues) => {
        if (!user || !childId) {
            toast({ title: 'Erro de autenticação ou dados.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        try {
            if (entryToEdit && entryToEdit.id) {
                // Update
                await updateSchoolScheduleEntry(entryToEdit.id, data);
                toast({ title: 'Aula atualizada!', description: `A aula de ${data.subject} foi atualizada no horário.` });
            } else {
                // Create
                const newEntryData = {
                    ...data,
                    childId,
                    ownerId: user.uid,
                    familyId: currentContext === 'my-space' ? null : currentContext,
                };
                await addSchoolScheduleEntry(newEntryData);
                toast({ title: 'Nova aula adicionada!', description: `A aula de ${data.subject} foi adicionada ao horário.` });
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
                    <DialogTitle>{entryToEdit ? 'Editar Aula' : 'Adicionar Nova Aula'}</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes da aula para o horário escolar.
                    </DialogDescription>
                </DialogHeader>
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
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
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
