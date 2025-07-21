
"use client";

// Esta página será movida ou adaptada para editar ChildRewardInstance
// Por agora, vamos criar a página para editar RewardTemplate

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getRewardTemplateById, updateRewardTemplate } from '@/lib/firebase/firestore'; // MUDADO
import type { RewardCategory, RewardTemplate } from '@/lib/types'; // MUDADO
import { rewardCategories } from '@/lib/types'; 
import { Loader2, Gift, Save, ArrowLeft } from 'lucide-react';

// Schema for RewardTemplate
const rewardTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional(),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
  status: z.enum(['active', 'archived']).default('active'),
});

type RewardTemplateFormValues = z.infer<typeof rewardTemplateFormSchema>;

export default function EditRewardTemplateRedirector() {
    const router = useRouter();
    const params = useParams();
    const rewardId = params.rewardId as string;

    useEffect(() => {
        if (rewardId) {
            router.replace(`/dashboard/rewards/edit-template/${rewardId}`);
        } else {
            router.replace('/dashboard/rewards');
        }
    }, [rewardId, router]);
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3">Redirecionando...</p>
        </div>
    );
}
