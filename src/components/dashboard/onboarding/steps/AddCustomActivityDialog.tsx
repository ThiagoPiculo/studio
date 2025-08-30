
"use client";

import { useState } from 'react';
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

const customActivitySchema = z.object({
  name: z.string().min(2, { message: "O nome da atividade deve ter pelo menos 2 caracteres." }),
  days: z.array(z.string()).min(1, "Selecione pelo menos um dia da semana."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário de início inválido."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário de término inválido."),
}).refine(data => data.startTime < data.endTime, {
    message: "O horário de término deve ser depois do início.",
    path: ["endTime"],
});

interface AddCustomActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddActivity: (activity: ActivityFormValues) => void;
  category: string;
}

const categoryPlaceholders: Record<string, string> = {
    'Terapias e Acompanhamentos de Saúde': 'Ex: Natação Terapêutica',
    'Prática de Esportes': 'Ex: Aula de Xadrez',
    'Prática de Artes': 'Ex: Aula de Teatro',
    'Prática de Idiomas': 'Ex: Aula de Mandarim',
};

export function AddCustomActivityDialog({ isOpen, onOpenChange, onAddActivity, category }: AddCustomActivityDialogProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const form = useForm<z.infer<typeof customActivitySchema>>({
        resolver: zodResolver(customActivitySchema),
        defaultValues: {
            name: '',
            days: [],
            startTime: '18:00',
            endTime: '19:00',
        },
    });

    const onSubmit = (values: z.infer<typeof customActivitySchema>) => {
        setIsProcessing(true);
        try {
            onAddActivity({ ...values, emoji: '✨' } as ActivityFormValues);
            toast({ title: "Atividade Adicionada!", description: `"${values.name}" foi adicionada à sua lista.` });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível adicionar a atividade.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Atividade Personalizada</DialogTitle>
                    <DialogDescription>
                        Crie uma nova atividade para a categoria "{category}".
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="custom-activity-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Atividade</FormLabel>
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
                        Salvar Atividade
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
