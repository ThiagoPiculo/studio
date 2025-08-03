import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"
import { createFamily } from "@/lib/firebase/firestore"
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
import { useRouter } from "next/navigation"

const formSchema = z.object({
  familyName: z.string().min(2, {
    message: "Nome da família deve ter pelo menos 2 caracteres.",
  }),
})

export function CreateFamilyDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      familyName: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true)
    try {
      if (!user) return
      await createFamily(user.uid, values.familyName)
      toast({
        title: "Família criada.",
        description: "Sua família foi criada com sucesso.",
      })
      router.refresh()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar sua família. Tente novamente.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    
      
        
          
            Nova Aliança
          
          
            Dê um nome para a sua aliança!
          
        
        
          
            
              
                {...form.register("familyName")}
                placeholder="Nome da família"
              
              
                {form.formState.errors.familyName?.message}
              
            
          
        
        
          
            
              Cancelar
            
            
              {isPending ? (
                
                  
                
              ) : (
                "Criar"
              )}
            
          
        
      
    
  )
}
