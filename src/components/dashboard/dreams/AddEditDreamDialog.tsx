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
import { createDream, updateDream } from "@/lib/firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Dream } from "@/lib/types"
import { useState } from "react"

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
      
        
          
            
              {currentDream ? "Editar Sonho" : "Adicionar Sonho"}
            
            
              
              
                
                  
                    
                      Título
                    
                    
                      Nome do sonho
                    
                    
                      
                        {...form.register("title")}
                        placeholder="Cachorro, boneca, videogame..."
                      
                      
                        {form.formState.errors.title?.message}
                      
                    
                  
                
                
                  
                    
                      Descrição
                    
                    
                      Mais detalhes sobre o sonho
                    
                    
                      
                        {...form.register("description")}
                        placeholder="Descreva o que você quer ganhar!"
                      
                      
                        {form.formState.errors.description?.message}
                      
                    
                  
                
                
                  
                    
                      Compartilhado
                    
                    
                      
                        Compartilhar com sua familia
                      
                    
                  
                
              
            
            
              
                Cancelar
              
              
                {isPending ? (
                  
                    
                  
                ) : (
                  "Salvar"
                )}
              
            
          
        
      
    )
}
