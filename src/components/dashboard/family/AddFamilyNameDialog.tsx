import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"
import { updateFamilyName } from "@/lib/firebase/firestore"
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
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nome da família deve ter pelo menos 2 caracteres.",
  }),
})

interface AddFamilyNameDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  onNameChanged: () => void
}

export function AddFamilyNameDialog({ isOpen, onOpenChange, familyId, onNameChanged }: AddFamilyNameDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true)
    try {
      if (!user) return
      await updateFamilyName(familyId, user.uid, values.name)
      toast({
        title: "Nome da família atualizado.",
        description: "O nome da sua família foi alterado com sucesso.",
      })
      onNameChanged()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o nome da família. Tente novamente.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    
      
        
          
            Nome da Família
          
          
            Qual nome gostaria de dar para sua família?
          
        
        
          
            
              
                {...form.register("name")}
                placeholder="Nome da família"
              
              
                {form.formState.errors.name?.message}
              
            
          
        
        
          
            
              Cancelar
            
            
              {isPending ? (
                
                  
                
              ) : (
                "Salvar"
              )}
            
          
        
      
    
  )
}
