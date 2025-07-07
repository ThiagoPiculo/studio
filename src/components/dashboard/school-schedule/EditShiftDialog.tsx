
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
import type { ChildProfile, SchoolShift } from '@/lib/types';
import { schoolShifts } from '@/lib/types';
import { updateChildProfile } from '@/lib/firebase/firestore';

const shiftFormSchema = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable'], {
    required_error: "Por favor, selecione o turno escolar.",
  }),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
}).superRefine((data, ctx) => {
  const isShiftApplicable = data.schoolShift !== 'not_applicable';
  if (isShiftApplicable) {
    if (!data.schoolShiftStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftStart'],
        message: 'O horário de início é obrigatório.',
      });
    }
    if (!data.schoolShiftEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftEnd'],
        message: 'O horário de término é obrigatório.',
      });
    }
    if (data.schoolShiftStart && data.schoolShiftEnd && data.schoolShiftEnd <= data.schoolShiftStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schoolShiftEnd'],
        message: 'O horário final deve ser depois do inicial.',
      });
    }
  }
});

type FormValues = z.infer<typeof shiftFormSchema>;

interface EditShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  child: ChildProfile | null;
}

export function EditShiftDialog({ isOpen, onOpenChange, onSave, child }: EditShiftDialogProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(shiftFormSchema),
        defaultValues: {
            schoolShift: 'not_applicable',
            schoolShiftStart: '',
            schoolShiftEnd: '',
        }
    });
    
    useEffect(() => {
        if (child) {
            form.reset({
                schoolShift: child.schoolShift || 'not_applicable',
                schoolShiftStart: child.schoolShiftStart || '',
                schoolShiftEnd: child.schoolShiftEnd || '',
            });
        }
    }, [child, form]);

    const watchedSchoolShift = form.watch('schoolShift');

    const onSubmit = async (data: FormValues) => {
        if (!child) {
            toast({ title: 'Erro de dados.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        try {
            const updates: Partial<ChildProfile> = {
                schoolShift: data.schoolShift,
                schoolShiftStart: data.schoolShift !== 'not_applicable' ? data.schoolShiftStart : '',
                schoolShiftEnd: data.schoolShift !== 'not_applicable' ? data.schoolShiftEnd : '',
            };
            await updateChildProfile(child.id, updates);
            toast({ title: 'Turno escolar atualizado!', description: `O turno de ${child.name} foi salvo.` });
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving shift entry', error);
            toast({ title: 'Erro ao salvar', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!child) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Turno Escolar de {child.name}</DialogTitle>
                    <DialogDescription>
                        Ajuste o turno e os horários para uma agenda mais precisa.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="schoolShift"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Turno Escolar</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o turno..."/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {schoolShifts.map(shift => (
                                                <SelectItem key={shift.id} value={shift.id}>{shift.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {watchedSchoolShift !== 'not_applicable' && (
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="schoolShiftStart"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Início do Turno</FormLabel>
                                            <FormControl><Input type="time" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="schoolShiftEnd"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fim do Turno</FormLabel>
                                            <FormControl><Input type="time" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                        )}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Turno
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
