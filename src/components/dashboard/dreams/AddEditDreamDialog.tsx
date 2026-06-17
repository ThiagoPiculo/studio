
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createDream, updateDream } from "@/lib/supabase/db"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Dream } from "@/lib/types"
import { useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Título deve ter pelo menos 2 caracteres.",
      }),
    description: z.string().optional(),
    isShared: z.boolean().default(false).optional(),
  })
  
interface AddEditDreamDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    currentDream?: Dream
    onAssigned?: () => void
}
  
export function AddEditDreamDialog({ isOpen, onOpenChange, currentDream, onAssigned }: AddEditDreamDialogProps) {
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast()
  
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        title: currentDream?.title || "",
        description: currentDream?.description || "",
        isShared: currentDream?.isShared || false,
      },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true)
        try {
            if (currentDream) {
                await updateDream(currentDream.id, values)
                toast({
                    title: "Sonho atualizado.",
                    description: "Seu sonho foi atualizado com sucesso.",
                })
            } else {
                await createDream(values)
                toast({
                    title: "Sonho adicionado.",
                    description: "Seu sonho foi criado com sucesso.",
                })
            }
            onAssigned?.()
            onOpenChange(false)
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível salvar seu sonho. Tente novamente.",
            })
        } finally {
            setIsPending(false)
        }
    }
   
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentDream ? "Editar Sonho" : "Adicionar Sonho"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormDescription>Nome do sonho</FormDescription>
                        <FormControl>
                          <Input {...field} placeholder="Cachorro, boneca, videogame..."/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormDescription>Mais detalhes sobre o sonho</FormDescription>
                        <FormControl>
                          <Textarea {...field} placeholder="Descreva o que você quer ganhar!"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isShared"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <Label htmlFor="isShared">Compartilhado</Label>
                        <FormDescription>Compartilhar com sua familia</FormDescription>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </form>
            </Form>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" form="add-edit-dream-form" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    )
}
