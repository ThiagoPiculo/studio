import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { joinFamilyByInviteCode } from "@/lib/firebase/firestore"
import { Loader2 } from "lucide-react"

export function JoinAllianceCard() {
    const [inviteCode, setInviteCode] = useState("")
    const [isPending, setIsPending] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async () => {
        setIsPending(true)
        try {
            await joinFamilyByInviteCode("YOUR_USER_ID", inviteCode)
            toast({
                title: "Aliança Aceita.",
                description: "Você entrou para a aliança!",
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: error.message,
            })
        } finally {
            setIsPending(false)
        }
    }
  return (
    
      
        
          
            Entrar para uma Aliança
          
          
            Entre com o código de convite da sua aliança.
          
        
        
          
            
              
                <Input
                  type="text"
                  placeholder="Código de Convite"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={isPending}
                />
              
              
                {isPending ? (
                  
                    
                  
                ) : (
                  "Entrar"
                )}
              
            
          
        
      
    
  )
}
