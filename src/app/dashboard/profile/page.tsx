
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Edit3, Save, KeyRound, Mail, AlertTriangle, Trash2, RotateCcw, CalendarOff, Shield, UploadCloud, Camera } from 'lucide-react';
import { updateProfile as updateAuthProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { resetPassword, deleteUserAccount } from '@/lib/firebase/auth';
import { getChildProfilesByOwner, getChildProfilesByFamily, getFamilyMembers, resetSelectedChildrenProgress, resetSchedulesForChildren, getUserProfile, uploadUserAvatarAndUpdateProfile } from '@/lib/firebase/firestore';
import type { ChildProfile, UserProfile } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent as DialogContentCrop, DialogHeader as DialogHeaderCrop, DialogTitle as DialogTitleCrop, DialogDescription as DialogDescriptionCrop, DialogFooter as DialogFooterCrop } from '@/components/ui/dialog';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';


export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isResetProgressDialogOpen, setIsResetProgressDialogOpen] = useState(false);
  const [selectedChildrenForProgress, setSelectedChildrenForProgress] = useState<Record<string, boolean>>({});

  const [isResettingRoutines, setIsResettingRoutines] = useState(false);
  const [isResetRoutinesDialogOpen, setIsResetRoutinesDialogOpen] = useState(false);
  const [selectedChildrenForRoutines, setSelectedChildrenForRoutines] = useState<Record<string, boolean>>({});
  
  const [allContextChildren, setAllContextChildren] = useState<ChildProfile[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoadingDialogData, setIsLoadingDialogData] = useState(true);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // States for avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);


  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  useEffect(() => {
    if (!isCameraDialogOpen) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      return;
    }
  
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setHasCameraPermission(true);
      } catch (error) {
        setHasCameraPermission(false);
        setIsCameraDialogOpen(false);
      }
    };
  
    getCameraPermission();
  
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraDialogOpen, toast]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

   useEffect(() => {
    if (!user || !availableContexts.length) return;

    const fetchDialogData = async () => {
        setIsLoadingDialogData(true);
        const childrenPromises: Promise<ChildProfile[]>[] = [];
        const membersMap = new Map<string, UserProfile>();
        if(user) membersMap.set(user.uid, user);

        for (const context of availableContexts) {
            if (context.id === 'my-space') {
                childrenPromises.push(getChildProfilesByOwner(user.uid, true)); // true for only unassigned
            } else {
                childrenPromises.push(getChildProfilesByFamily(context.id));
                const members = await getFamilyMembers(context.id);
                members.forEach(member => membersMap.set(member.uid, member));
            }
        }
        
        try {
            const childrenResults = await Promise.all(childrenPromises);
            const allChildren = childrenResults.flat();
             const uniqueChildren = allChildren.filter((child, index, self) =>
                index === self.findIndex((c) => c.id === child.id)
            );

            setAllContextChildren(uniqueChildren);
            setMemberProfiles(Object.fromEntries(membersMap));
        } catch (error) {
            console.error("Error fetching data for dialogs:", error);
            toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar a lista completa de crianças e membros.", variant: "destructive" });
        } finally {
            setIsLoadingDialogData(false);
        }
    };

    fetchDialogData();
  }, [user, availableContexts, toast]);
  
  const groupedChildren = useMemo(() => {
    const groups: Record<string, ChildProfile[]> = { 'my-space': [] };
    
    allContextChildren.forEach(child => {
        const contextId = child.familyId || 'my-space';
        if (!groups[contextId]) {
            groups[contextId] = [];
        }
        groups[contextId].push(child);
    });

    return Object.entries(groups).map(([contextId, childrenInGroup]) => {
      const contextInfo = availableContexts.find(c => c.id === contextId);
      const contextName = contextId === 'my-space' 
        ? 'No Meu Espaço' 
        : `Na Aliança "${contextInfo?.name || 'Desconhecida'}"`;
      return { contextId, contextName, children: childrenInGroup.sort((a,b) => a.name.localeCompare(b.name)) };
    }).filter(group => group.children.length > 0);
  }, [allContextChildren, availableContexts]);


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const handleSaveName = async () => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    if (displayName.trim().length < 2) {
      toast({ title: "Nome Inválido", description: "O nome deve ter pelo menos 2 caracteres.", variant: "destructive" });
      return;
    }

    setIsSavingName(true);
    try {
      await updateAuthProfile(auth.currentUser, { displayName: displayName.trim() });
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name: displayName.trim() });
      toast({ title: "Identidade de Heroi Atualizada!", description: "Seu nome foi atualizado com sucesso." });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível atualizar seu nome. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast({ title: "Erro", description: "E-mail do usuário não encontrado.", variant: "destructive" });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await resetPassword(user.email);
      toast({ title: "Mapa Secreto Enviado!", description: "Enviamos um link para o seu e-mail para que você possa criar uma nova senha." });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({ title: "Erro ao Enviar E-mail", description: "Não foi possível enviar o e-mail de redefinição. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleResetSelectedProgress = async () => {
    if (!user) return;
    const childIdsToReset = Object.entries(selectedChildrenForProgress).filter(([, selected]) => selected).map(([id]) => id);
    if (childIdsToReset.length === 0) {
        toast({ title: "Nenhuma criança selecionada." });
        return;
    }
    setIsResettingProgress(true);
    try {
      await resetSelectedChildrenProgress(user.uid, childIdsToReset);
      const childNames = allContextChildren.filter(c => childIdsToReset.includes(c.id)).map(c => c.name);
      toast({ title: "Progresso Redefinido!", description: `O progresso de ${formatChildNames(childNames)} foi zerado.` });
      setIsResetProgressDialogOpen(false);
      setSelectedChildrenForProgress({});
    } catch (error: any) {
      console.error("Error resetting progress for selected children:", error);
      toast({ title: "Erro ao Redefinir", description: error.message || "Não foi possível redefinir o progresso.", variant: "destructive" });
    } finally {
      setIsResettingProgress(false);
    }
  };

  const handleResetSelectedRoutines = async () => {
    if (!user) return;
    const childIdsToReset = Object.entries(selectedChildrenForRoutines).filter(([, selected]) => selected).map(([id]) => id);
    if (childIdsToReset.length === 0) {
        toast({ title: "Nenhuma criança selecionada." });
        return;
    }
    setIsResettingRoutines(true);
    try {
      await resetSchedulesForChildren(user.uid, childIdsToReset);
      const childNames = allContextChildren.filter(c => childIdsToReset.includes(c.id)).map(c => c.name);
      toast({ title: "Rotinas Removidas!", description: `Todas as missões agendadas para ${formatChildNames(childNames)} foram removidas.` });
      setIsResetRoutinesDialogOpen(false);
      setSelectedChildrenForRoutines({});
    } catch (error: any) {
      console.error("Error resetting routines for selected children:", error);
      toast({ title: "Erro ao Remover Rotinas", description: error.message || "Não foi possível limpar a agenda das crianças selecionadas.", variant: "destructive" });
    } finally {
      setIsResettingRoutines(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Prompt for password
    const password = prompt("Para sua segurança, por favor, insira sua senha para confirmar a exclusão da conta.");
    if (password === null) { // User clicked cancel
      return;
    }
    if (!password) {
      toast({ title: "Senha necessária", description: "A senha é obrigatória para excluir a conta.", variant: "destructive" });
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteUserAccount(password);
      toast({ title: "Conta Excluída", description: "Sua conta foi excluída permanentemente. Sentiremos sua falta!" });
      // The logout is handled inside deleteUserAccount which will trigger the AuthProvider to redirect.
    } catch (error: any) {
      let description = "Ocorreu um erro ao excluir a conta.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "A senha informada está incorreta. A exclusão foi cancelada.";
      } else if (error.code === 'auth/requires-recent-login') {
        description = "Sua sessão expirou. Por favor, faça login novamente e tente excluir sua conta mais uma vez.";
         // Force logout so user has to log in again with fresh credentials
        await logout();
      }
      toast({
        title: "Falha na Exclusão",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteConfirmOpen(false);
    }
  };
  
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  const formatChildNames = (names: string[]) => {
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    const last = names.pop();
    return `${names.join(', ')} e ${last}`;
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleTakePicture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setImageSrc(dataUrl);
        setIsCameraDialogOpen(false);
      }
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop({
      unit: 'px',
      x: 0,
      y: 0,
      width: Math.min(width, height),
      height: Math.min(width, height)
    });
  };

  function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return Promise.reject(new Error("Canvas context could not be created."));
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

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
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            },
            'image/png',
            0.9
        );
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
        toast({ title: "Erro no Upload", variant: "destructive" });
    } finally {
        setIsUploadingAvatar(false);
    }
  };

  const selectedProgressCount = useMemo(() => Object.values(selectedChildrenForProgress).filter(Boolean).length, [selectedChildrenForProgress]);
  const selectedRoutinesCount = useMemo(() => Object.values(selectedChildrenForRoutines).filter(Boolean).length, [selectedChildrenForRoutines]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p>Usuário não encontrado. Por favor, faça login novamente.</p>
        <Button onClick={() => router.push('/auth/login')} className="mt-4">Ir para Login</Button>
      </div>
    );
  }

  const renderChildSelection = (
    child: ChildProfile,
    selectionState: Record<string, boolean>,
    onSelectionChange: (id: string, checked: boolean) => void
  ) => {
    const isOwner = child.ownerId === user.uid;
    const ownerName = isOwner ? 'Você' : memberProfiles[child.ownerId]?.name || 'Desconhecido';
    const id = `reset-child-${child.id}`;

    return (
      <div
        key={child.id}
        className={cn(
          "flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 transition-colors",
          !isOwner && "bg-muted/50 opacity-70 cursor-not-allowed"
        )}
      >
        <Checkbox
          id={id}
          checked={!!selectionState[child.id]}
          onCheckedChange={(checked) => onSelectionChange(child.id, !!checked)}
          disabled={!isOwner}
        />
        <Label htmlFor={id} className={cn("flex-grow flex items-center gap-3", isOwner ? "cursor-pointer" : "cursor-not-allowed")}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={child.avatar} alt={child.name} />
            <AvatarFallback style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span>{child.name}</span>
            {!isOwner && (
                <span className="text-xs italic text-muted-foreground/80">(Proprietário: {ownerName})</span>
            )}
          </div>
        </Label>
      </div>
    );
  };


  return (
    <>
      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Tirar Foto para o Avatar</DialogTitle>
                  <DialogDescription>
                      Posicione seu rosto no centro da câmera e clique em "Capturar!".
                  </DialogDescription>
              </DialogHeader>
              <div className="my-4">
                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                  {hasCameraPermission === false && (
                      <div className="text-destructive text-sm text-center mt-2">Câmera não acessível. Por favor, habilite a permissão no seu navegador.</div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCameraDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleTakePicture} disabled={!hasCameraPermission || !cameraStream}>
                      <Camera className="mr-2 h-4 w-4" /> Capturar!
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <Dialog open={!!imageSrc} onOpenChange={(open) => !open && setImageSrc(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Recortar Foto de Perfil</DialogTitle>
                <DialogDescription>
                    Ajuste a imagem para criar o avatar perfeito. O formato já está travado em 1:1.
                </DialogDescription>
            </DialogHeader>
            {imageSrc && (
                <div className="flex justify-center my-4">
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        aspect={1}
                        circularCrop
                    >
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
      
      <div className="space-y-8 max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
               <div className="relative group flex-shrink-0">
                <Avatar className="h-20 w-20 text-3xl shadow-md ring-4 ring-offset-2 ring-primary ring-offset-background">
                  <AvatarImage src={avatarPreview || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="font-bold">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md group-hover:bg-primary group-hover:text-primary-foreground"
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Carregar Imagem
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsCameraDialogOpen(true)}>
                      <Camera className="mr-2 h-4 w-4" />
                      Tirar Foto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                 <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <CardTitle className="text-3xl font-headline">Meu Perfil</CardTitle>
                <CardDescription>Gerencie suas informações pessoais.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">E-mail</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <p id="email" className="text-lg">{user.email}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Seu e-mail de login não pode ser alterado por aqui.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Nome de Exibição</Label>
              {!isEditingName ? (
                <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-muted/20">
                  <p id="name" className="text-lg">{user.name || 'Não definido'}</p>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)} className="shadow-sm">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar Nome
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                  <Input
                    id="name"
                    value={displayName}
                    onChange={handleNameChange}
                    className="text-lg"
                    placeholder="Seu nome de exibição"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setIsEditingName(false); setDisplayName(user.name || ''); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveName} disabled={isSavingName} className="bg-primary hover:bg-primary/90">
                      {isSavingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar Nome
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/50 shadow-lg">
          <CardHeader className="bg-destructive/5">
              <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-6 w-6"/> Zona de Perigo</CardTitle>
              <CardDescription className="text-destructive/90">As ações abaixo são importantes e, em alguns casos, irreversíveis. Use com cuidado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-1">
                  <h4 className="font-semibold">Redefinir Senha</h4>
                  <p className="text-sm text-muted-foreground">Será enviado um link para seu e-mail (<span className="font-semibold text-foreground">{user.email}</span>) para que você possa criar uma nova senha de acesso.</p>
                  <Button 
                    variant="outline" 
                    onClick={handlePasswordReset} 
                    disabled={isSendingResetEmail}
                    className="w-full sm:w-auto shadow-sm"
                  >
                    {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Enviar E-mail de Redefinição
                  </Button>
              </div>
              
              <Separator className="my-8" />
              
              <div className="space-y-1">
                  <h4 className="font-semibold">Redefinir Progresso dos Herois</h4>
                  <p className="text-sm text-muted-foreground">Zera as estrelas, XP e o histórico de missões das crianças selecionadas. Ideal para começar uma "nova temporada".</p>
                   <AlertDialog open={isResetProgressDialogOpen} onOpenChange={setIsResetProgressDialogOpen}>
                      <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isLoadingDialogData || allContextChildren.length === 0 || isResettingProgress}>
                              <RotateCcw className="mr-2 h-4 w-4" /> Redefinir Progresso
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Redefinir o progresso de quais heróis?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Apenas os herois que você cadastrou podem ser selecionados. Esta ação é irreversível e afetará estrelas, XP, níveis e históricos.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <ScrollArea className="max-h-[40vh] my-4 pr-3">
                             <div className="space-y-4">
                               {groupedChildren.map(group => (
                                 <div key={group.contextId}>
                                   <Label className="font-semibold text-muted-foreground">{group.contextName}</Label>
                                   <div className="space-y-2 mt-2">
                                    {group.children.map(child => renderChildSelection(child, selectedChildrenForProgress, (id, checked) => setSelectedChildrenForProgress(prev => ({...prev, [id]: checked}))
                                    ))}
                                    </div>
                                 </div>
                               ))}
                             </div>
                          </ScrollArea>
                          <AlertDialogFooter>
                              <AlertDialogCancel disabled={isResettingProgress}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleResetSelectedProgress} className="bg-destructive hover:bg-destructive/90" disabled={isResettingProgress || selectedProgressCount === 0}>
                                  {isResettingProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Redefinir ({selectedProgressCount})
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                   </AlertDialog>
              </div>

              <Separator className="my-8" />

              <div className="space-y-1">
                  <h4 className="font-semibold">Redefinir Rotina Agendada</h4>
                  <p className="text-sm text-muted-foreground">Remove TODAS as missões (únicas e recorrentes) da agenda das crianças selecionadas. Use para limpar a agenda e começar do zero.</p>
                   <AlertDialog open={isResetRoutinesDialogOpen} onOpenChange={setIsResetRoutinesDialogOpen}>
                      <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isLoadingDialogData || allContextChildren.length === 0 || isResettingRoutines}>
                              <CalendarOff className="mr-2 h-4 w-4" /> Redefinir Rotinas
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Limpar a agenda de quais heróis?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Apenas os herois que você cadastrou podem ser selecionados. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <ScrollArea className="max-h-[40vh] my-4 pr-3">
                             <div className="space-y-4">
                               {groupedChildren.map(group => (
                                 <div key={group.contextId}>
                                   <Label className="font-semibold text-muted-foreground">{group.contextName}</Label>
                                   <div className="space-y-2 mt-2">
                                    {group.children.map(child => renderChildSelection(child, selectedChildrenForRoutines, (id, checked) => setSelectedChildrenForRoutines(prev => ({...prev, [id]: checked}))
                                    ))}
                                    </div>
                                 </div>
                               ))}
                             </div>
                          </ScrollArea>
                          <AlertDialogFooter>
                              <AlertDialogCancel disabled={isResettingRoutines}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleResetSelectedRoutines} className="bg-destructive hover:bg-destructive/90" disabled={isResettingRoutines || selectedRoutinesCount === 0}>
                                  {isResettingRoutines && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Limpar Agenda ({selectedRoutinesCount})
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                   </AlertDialog>
              </div>
              
              <Separator className="my-8" />
              
               <div className="space-y-1">
                  <h4 className="font-semibold">Excluir Conta Permanentemente</h4>
                  <p className="text-sm text-muted-foreground">Isso removerá sua conta de Mestre e todos os dados associados (perfis de crianças, missões, etc.) de forma permanente.</p>
                  <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full sm:w-auto shadow-sm">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Minha Conta
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza ABSOLUTA?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Esta ação é final e não pode ser desfeita. Para confirmar a exclusão, por favor, insira sua senha abaixo. Todos os seus dados, incluindo perfis de crianças, missões e recompensas, serão **excluídos permanentemente**.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeletingAccount}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingAccount}>
                                  {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Confirmar Exclusão
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                   </AlertDialog>
              </div>

          </CardContent>
        </Card>
      </div>
    </>
  );
}
