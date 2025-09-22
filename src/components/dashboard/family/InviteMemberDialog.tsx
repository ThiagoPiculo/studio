
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createFamilyInvitation } from '@/lib/firebase/firestore';
import { Loader2, UserPlus, Copy, Link as LinkIcon, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  familyId: string;
  familyName: string;
  inviteCode?: string;
  onInvitationSent?: () => void;
}

export function InviteMemberDialog({
  isOpen,
  onOpenChange,
  familyId,
  familyName,
  inviteCode,
  onInvitationSent,
}: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: InviteFormValues) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await createFamilyInvitation(familyId, user.uid, user.name || 'Um amigo', values.email);
      toast({
        title: "Convite Enviado!",
        description: `Um convite para a aliança "${familyName}" foi enviado para ${values.email}.`,
      });
      onInvitationSent?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
       if (error.message.includes("Este usuário já é um membro da aliança.")) {
        toast({
          title: "Membro já na equipe!",
          description: `O usuário com o e-mail ${values.email} já faz parte desta aliança.`,
          variant: "default",
        });
      } else if (error.message.includes("Nenhum usuário encontrado com este e-mail.")) {
          toast({
              title: "Herói Ainda Não Cadastrado",
              description: "O e-mail que você inseriu não pertence a um usuário cadastrado. Peça para a pessoa criar uma conta primeiro.",
              variant: "default",
          });
      } else {
        toast({ title: "Erro ao Convidar", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyLink = () => {
    if (!inviteCode || !isClient) return;
    const inviteLink = `${window.location.origin}/auth/register?invite_code=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Link de Convite Copiado!", description: "O link foi copiado. Compartilhe para aumentar a equipe!" });
  };
  
  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "Código Copiado!", description: "O código de convite está na sua área de transferência." });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para a Aliança "{familyName}"</DialogTitle>
           <div className="flex items-center gap-2">
                <DialogDescription>
                    Adicione um colaborador por e-mail ou código.
                </DialogDescription>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="link" size="icon" className="h-5 w-5 text-muted-foreground"><Info className="h-4 w-4"/></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3">
                        <h4 className="font-medium leading-none">Como Convidar?</h4>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p><b>1. Convite por E-mail (Recomendado):</b> Use se a pessoa já tem conta no Mini Herois. Ela receberá uma notificação para aceitar.</p>
                          <p><b>2. Convite por Código ou Link:</b> Ideal para novos usuários. Envie o link ou código para eles. Você precisará aprovar a entrada deles na sua aliança depois que se cadastrarem.</p>
                        </div>
                        <PopoverClose asChild>
                            <Button className="w-full">Entendi 👍</Button>
                        </PopoverClose>
                    </PopoverContent>
                </Popover>
           </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="invite-email">E-mail do Convidado</Label>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="email@exemplo.com"
                        disabled={isProcessing}
                        {...field}
                      />
                    </FormControl>
                    <Button type="submit" disabled={isProcessing} className="shrink-0">
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>
                   <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        {inviteCode && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>
            <div className="space-y-3">
                 <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted border">
                    <Label className="text-sm font-semibold">Código de Convite:</Label>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-lg tracking-widest text-primary">{inviteCode}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button onClick={handleCopyLink} variant="link" className="p-0 h-auto text-sm">
                    <LinkIcon className="mr-2 h-4 w-4"/> Copiar link de convite direto
                </Button>
            </div>
          </>
        )}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
