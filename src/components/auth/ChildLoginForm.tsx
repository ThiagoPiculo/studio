
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Camera, XCircle } from "lucide-react";
import { findChildByAccessCode } from "@/lib/firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { facialLoginFlow } from '@/ai/flows/facial-login-flow';

const childLoginSchema = z.object({
  accessCode: z
    .string()
    .length(6, { message: "Hmm, sua Chave Secreta tem que ter 6 números. Conte direitinho e tente de novo, herói!" })
    .regex(/^\d{6}$/, { message: "Opa! A Chave Secreta só usa números, como 1, 2, 3... Tente digitar só os números mágicos!" }),
});

type ChildLoginFormValues = z.infer<typeof childLoginSchema>;

export function ChildLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { setChildAuthenticatedState } = useAuth();

  const [attemptingFacialLogin, setAttemptingFacialLogin] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facialVerificationMessage, setFacialVerificationMessage] = useState<string | null>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<ChildLoginFormValues>({
    resolver: zodResolver(childLoginSchema),
    defaultValues: { accessCode: "" },
  });

  useEffect(() => {
    if (attemptingFacialLogin) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          setFacialVerificationMessage("Permissão da câmera negada. Verifique as configurações do seu navegador.");
          toast({
            variant: 'destructive',
            title: 'Câmera Não Acessível',
            description: 'Por favor, permita o acesso à câmera para usar o reconhecimento facial.',
          });
        }
      };
      getCameraPermission();

      return () => { // Cleanup: stop video stream when component unmounts or facial login is exited
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [attemptingFacialLogin, toast]);

  const handleFacialLoginAttempt = () => {
    const accessCode = form.getValues('accessCode');
    if (!childLoginSchema.safeParse({ accessCode }).success) {
        form.trigger('accessCode'); // Mostra erro de validação se o código for inválido
        toast({
            title: "Código de Acesso Inválido",
            description: "Por favor, insira um código de acesso de 6 dígitos válido antes de tentar o reconhecimento facial.",
            variant: "destructive"
        });
        return;
    }
    setAttemptingFacialLogin(true);
    setFacialVerificationMessage(null);
  };

  const handleVerifyFaceAndLogin = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) {
      setFacialVerificationMessage("Câmera não está pronta ou permissão negada.");
      return;
    }
    setIsVerifyingFace(true);
    setFacialVerificationMessage(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setFacialVerificationMessage("Erro ao capturar imagem.");
      setIsVerifyingFace(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL('image/jpeg');
    const accessCode = form.getValues('accessCode');

    try {
      const facialResult = await facialLoginFlow({ imageDataUri, accessCode });
      if (facialResult.success) {
        toast({ title: "Verificação Facial", description: facialResult.message });
        // Se a "verificação facial" (detecção de rosto) for ok, prossiga com o login por código
        await processLoginWithCode(form.getValues());
      } else {
        setFacialVerificationMessage(facialResult.message || "Falha na verificação facial. Tente novamente.");
      }
    } catch (error) {
      console.error("Error in facial login flow:", error);
      setFacialVerificationMessage("Erro durante a verificação facial. Tente novamente.");
      toast({
        title: "Erro na Verificação",
        description: "Ocorreu um problema ao tentar verificar o rosto.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingFace(false);
    }
  };

  const processLoginWithCode = async (values: ChildLoginFormValues) => {
    setIsLoading(true); // Usar isLoading para o processo de login final
    try {
      const childProfile = await findChildByAccessCode(values.accessCode);
      if (childProfile) {
        setChildAuthenticatedState(childProfile);
        toast({ title: "Portal Desbloqueado!", description: `Bem-vindo(a) à aventura, ${childProfile.name}!` });
        router.push(`/dashboard/child/${childProfile.id}`);
      } else {
        setFacialVerificationMessage("Código de acesso não encontrado após verificação facial."); // Mensagem se o código for inválido
        toast({
          title: "Ops! Código Mágico Errado",
          description: "Essa chave não abriu o portal. Peça para um adulto conferir seu código ou tente digitar de novo com atenção!",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Child login failed:", error);
      setFacialVerificationMessage("Erro ao tentar fazer login com o código.");
      toast({
        title: "Algo Deu Errado...",
        description: "Não consegui verificar seu código mágico. Tente de novo daqui a pouquinho ou chame um adulto se o problema continuar.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAttemptingFacialLogin(false); // Reset facial login attempt state
    }
  };
  
  const onSubmit = async (values: ChildLoginFormValues) => {
    // Esta função agora é primariamente para login apenas com código,
    // ou chamada por handleVerifyFaceAndLogin após sucesso facial.
    await processLoginWithCode(values);
  };


  if (attemptingFacialLogin) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Verificação Facial</h3>
        <p className="text-sm text-muted-foreground text-center">Olhe para a câmera para uma verificação rápida!</p>
        
        <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-muted">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <XCircle className="w-12 h-12 text-destructive mb-2" />
              <p className="text-center font-semibold">Acesso à câmera negado.</p>
              <p className="text-center text-xs">Verifique as permissões no seu navegador.</p>
            </div>
          )}
           {hasCameraPermission === null && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
             </div>
           )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {facialVerificationMessage && (
          <Alert variant={facialVerificationMessage.includes("detectado") && !facialVerificationMessage.includes("Nenhum") ? "default" : "destructive"}>
            <AlertTitle>{facialVerificationMessage.includes("detectado") && !facialVerificationMessage.includes("Nenhum") ? "Info" : "Falha na Verificação"}</AlertTitle>
            <AlertDescription>{facialVerificationMessage}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleVerifyFaceAndLogin} 
          className="w-full h-12 text-lg" 
          disabled={isVerifyingFace || hasCameraPermission !== true}
        >
          {isVerifyingFace ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
          Verificar Rosto e Entrar
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setAttemptingFacialLogin(false)} disabled={isVerifyingFace}>
          Cancelar Verificação Facial
        </Button>
         <p className="text-xs text-muted-foreground text-center pt-2">
            Lembre-se: a autenticação final ainda usa seu código de acesso. Esta etapa apenas verifica se um rosto está presente.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-center block mb-2">Digite seu código de acesso (sua Chave Secreta de 6 números)</FormLabel>
              <FormControl>
                <Input
                  placeholder="1 2 3 4 5 6"
                  {...field}
                  className="h-16 text-3xl text-center tracking-[0.3em] font-mono shadow-inner bg-muted/30 border-2 border-primary/30 focus:border-primary focus:ring-primary text-primary"
                  maxLength={6}
                  autoComplete="off"
                  type="tel" 
                  inputMode="numeric" 
                  pattern="\d*" 
                />
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-14 text-xl rounded-lg shadow-lg transform hover:scale-105 transition-transform" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-6 w-6" />
          )}
          Entrar com Código
        </Button>
        <Button type="button" variant="outline" onClick={handleFacialLoginAttempt} className="w-full" disabled={isLoading}>
          <Camera className="mr-2 h-5 w-5" />
          Entrar com Reconhecimento Facial
        </Button>
      </form>
    </Form>
  );
}
