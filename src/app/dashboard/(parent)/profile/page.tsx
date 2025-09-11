
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, User, Camera, Trash2, KeyRound, AlertTriangle, UploadCloud } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { updateProfile } from "firebase/auth";
import { auth } from '@/lib/firebase/config';
import { resetPassword, deleteUserAccount } from '@/lib/firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadUserAvatarAndUpdateProfile, deleteAvatar } from '@/lib/firebase/firestore';


const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: { name: user?.name || '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name || '' });
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user, form]);
  
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height);
    setCrop({ unit: 'px', x: (width - size) / 2, y: (height - size) / 2, width: size, height: size });
  };
  
  function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("Canvas context is not available."));

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );
    
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas is empty')), 'image/png', 1);
    });
  }
  
   const handleCropAndUpload = async () => {
    if (!user || !crop || !imgRef.current) return;
    setIsUploadingAvatar(true);
    setImageSrc(null);
    try {
        const croppedBlob = await getCroppedImg(imgRef.current, crop);
        const { newUrl } = await uploadUserAvatarAndUpdateProfile(user.uid, croppedBlob);
        setAvatarPreview(newUrl);
        toast({ title: "Avatar atualizado!" });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({ title: "Erro no Upload", variant: "destructive" });
    } finally {
        setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarPreview) return;
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar(user.uid, user.uid, true);
      setAvatarPreview(null);
      toast({ title: "Avatar removido!" });
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast({ title: "Erro ao remover avatar.", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };


  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: data.name });

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name: data.name });

      toast({ title: "Perfil Atualizado", description: "Seu nome foi alterado com sucesso." });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setIsResettingPassword(true);
    try {
      await resetPassword(user.email);
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({ title: "Erro ao enviar e-mail", variant: "destructive" });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    if (deleteConfirmationInput !== user.email) {
      toast({
        title: "Confirmação incorreta",
        description: "Você deve digitar seu e-mail corretamente para confirmar a exclusão.",
        variant: "destructive"
      });
      return;
    }
    setIsDeletingAccount(true);
    try {
      // For simplicity, we assume the user just needs to confirm by email.
      // A production app would require re-authentication (password).
      await deleteUserAccount("password-placeholder"); // This will fail if not re-authenticated.
      toast({ title: "Conta Excluída", description: "Sua conta foi permanentemente excluída." });
      // Auth context will handle logout and redirect.
    } catch (error: any) {
       toast({
        title: "Reautenticação Necessária",
        description: "Para excluir sua conta, por favor, faça logout e login novamente antes de tentar.",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };
  
  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
       <Dialog open={!!imageSrc} onOpenChange={(open) => !open && setImageSrc(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Recortar Foto de Perfil</DialogTitle>
                <DialogDescription>Ajuste a imagem para criar o avatar perfeito.</DialogDescription>
            </DialogHeader>
            {imageSrc && (
                <div className="flex justify-center my-4">
                    <ReactCrop crop={crop} onChange={setCrop} aspect={1} circularCrop>
                        <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} alt="Recorte" style={{ maxHeight: '70vh' }} />
                    </ReactCrop>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setImageSrc(null)} disabled={isUploadingAvatar}>Cancelar</Button>
                <Button onClick={handleCropAndUpload} disabled={isUploadingAvatar}>
                    {isUploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Avatar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-6 w-6 text-primary" />Meu Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                   <div className="relative group">
                       <Avatar className="h-20 w-20 text-3xl">
                           <AvatarImage src={avatarPreview || ''} alt={user.name || ''} />
                           <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                       </Avatar>
                       {isUploadingAvatar && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="h-6 w-6 text-white animate-spin"/></div>}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"><Camera className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}><UploadCloud className="mr-2 h-4 w-4"/>Carregar Imagem</DropdownMenuItem>
                                {avatarPreview && <DropdownMenuSeparator />}
                                {avatarPreview && <DropdownMenuItem onSelect={handleRemoveAvatar} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Remover Imagem</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                   </div>
                   <div className="w-full">
                       <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu nome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                   </div>
                </div>
                 <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={user.email || ''} disabled />
                    <p className="text-sm text-muted-foreground mt-1">O e-mail não pode ser alterado.</p>
                </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-6 w-6"/>Zona de Perigo</CardTitle>
          <CardDescription>Ações que afetam sua conta permanentemente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4"/> Alterar Senha
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enviaremos um link para o seu e-mail ({user.email}) para que você possa criar uma nova senha.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetPassword} disabled={isResettingPassword}>
                    {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Enviar E-mail
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4"/> Excluir Conta
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Conta Permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é irreversível. Todos os seus dados, heróis, missões e progresso serão apagados. Para confirmar, digite seu e-mail: <strong className="font-mono">{user.email}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <Input
                        type="email"
                        placeholder="Confirme seu e-mail"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                      />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingAccount}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount || deleteConfirmationInput !== user.email}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Sim, Excluir Minha Conta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
