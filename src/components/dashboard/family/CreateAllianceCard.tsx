import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreateFamilyDialog } from "./CreateFamilyDialog"
import { CalendarClock, CalendarPlus, Users } from "lucide-react"

export function CreateAllianceCard() {
    const [open, setOpen] = useState(false)
  return (
    
      
        
          
            
              Nova Aliança
            
            
              Crie sua aliança familiar e conecte todos os seus heróis!
            
          
        
        
          
            
              Criar
            
          
        
      

      
    
  )
}
