import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input"
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

const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, insira um endereço de e-mail válido.",
  }),
})

export function DeleteAccountModal() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const { user, deleteUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (values.email !== user?.email) {
        return toast({
          variant: "destructive",
          title: "E-mail incorreto",
          description: "Por favor, insira o e-mail associado à sua conta.",
        })
      }

      await deleteUser()
      toast({
        description: "Sua conta foi excluída com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir sua conta. Tente novamente.",
      })
    }
  }

  return (
    
      
        
          Apagar Conta
        
      
      
        
          
            Você tem certeza absoluta?
          
          
            Esta ação não pode ser desfeita. Isso removerá permanentemente sua conta,
            incluindo todas as suas informações e missões.
          
        
        
          
            
              Digite seu e-mail para confirmar.
            
            
              
                {...form.register("email")}
                placeholder="email@example.com"
                disabled={!open}
              
              
                {form.formState.errors.email?.message}
              
            
          
        
        
          
            
              Cancelar
            
            
              Apagar Conta
            
          
        
      
    
  )
}
