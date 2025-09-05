
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Save } from 'lucide-react';
import { allWeekdays, weekdayLabels, type Weekday } from '@/lib/types';
import { TimePicker } from "../../missions/TimePicker";
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { extraActivitySchema, type ActivityFormValues } from '../OnboardingForm';

interface AddCustomActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveActivity: (activity: ActivityFormValues) => void;
  category: string;
  activityToEdit?: ActivityFormValues | null;
}

const categoryPlaceholders: Record<string, string> = {
    'Terapias e Acompanhamentos de Saúde': 'Ex: Natação Terapêutica',
    'Prática de Esportes': 'Ex: Aula de Xadrez',
    'Prática de Artes': 'Ex: Aula de Teatro',
    'Prática de Idiomas': 'Ex: Aula de Mandarim',
};

export function AddCustomActivityDialog({ isOpen, onOpenChange, onSaveActivity, category, activityToEdit }: AddCustomActivityDialogProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(extraActivitySchema),
        defaultValues: {
            name: '',
            days: [],
            startTime: '18:00',
            endTime: '19:00',
            emoji: '✨',
            source: 'custom',
            category: category,
        },
    });
    
    useEffect(() => {
        if(activityToEdit) {
            form.reset(activityToEdit);
        } else {
             form.reset({
                name: '',
                days: [],
                startTime: '18:00',
                endTime: '19:00',
                emoji: '✨',
                source: 'custom',
                category: category,
            });
        }
    }, [activityToEdit, isOpen, form, category]);

    const onSubmit = (values: ActivityFormValues) => {
        setIsProcessing(true);
        try {
            onSaveActivity(values);
            toast({ title: `Atividade ${activityToEdit ? 'Atualizada' : 'Adicionada'}!`, description: `"${values.name}" foi salva na sua lista.` });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível salvar a atividade.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activityToEdit ? 'Editar Missão' : 'Adicionar Outra Missão'}</DialogTitle>
                    <DialogDescription>
                        {activityToEdit ? 'Edite os detalhes desta missão personalizada.' : `Crie uma nova missão para a categoria "${category}".`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="custom-activity-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Missão</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={categoryPlaceholders[category] || 'Ex: Nova Atividade'} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="days"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dias da Semana</FormLabel>
                                    <FormControl>
                                        <ToggleGroup type="multiple" variant="outline" value={field.value} onValueChange={field.onChange} className="flex flex-wrap justify-start gap-1">
                                            {allWeekdays.map(day => (
                                                <ToggleGroupItem key={day} value={day} className="h-7 w-7 p-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                                    {weekdayLabels[day].short}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => (
                                <FormItem><FormLabel>Início</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => (
                                <FormItem><FormLabel>Fim</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" form="custom-activity-form" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Missão
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
