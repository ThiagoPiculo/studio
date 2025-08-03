import { Button } from "@/components/ui/button"
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

interface DeleteConfirmationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmation({ isOpen, onOpenChange, onConfirm, isLoading }: DeleteConfirmationProps) {
  return (
    
      
        
          
            Tem certeza absoluta?
          
          
            Esta ação não pode ser desfeita. Isso removerá permanentemente seus dados.
          
        
        
          
            
              Cancelar
            
            
              Deletar
            
          
        
      
    
  )
}
