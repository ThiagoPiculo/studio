
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
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { signInAdmin, signUpAdmin, resetPassword } from "@/lib/firebase/auth";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import { joinFamilyByInviteCode } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Label } from "../ui/label";

const loginSchema = z.object({
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type MasterUserAuthFormProps = {
  mode: "login" | "register";
  inviteCode?: string | null;
};

export function MasterUserAuthForm({ mode, inviteCode }: MasterUserAuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const formSchema = mode === "login" ? loginSchema : registerSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mode === 'login' ? { email: "", password: "" } : { name: "", email: "", password: "", confirmPassword: "" },
  });

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "E-mail necessário",
        description: "Por favor, insira seu e-mail para enviarmos o link de recuperação.",
        variant: "destructive",
      });
      return;
    }
    setIsResetting(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: "Link Enviado!",
        description: "Enviamos um link para o seu e-mail para que você possa criar uma nova senha. Se não encontrar, verifique sua caixa de spam!",
      });
    } catch (error: any) {
        let description = "Ocorreu um erro. Verifique o e-mail digitado ou tente novamente mais tarde.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            description = "Não encontramos uma conta com este e-mail. Verifique se o e-mail está correto.";
        }
        toast({
            title: "Erro ao enviar e-mail",
            description,
            variant: "destructive",
        });
    } finally {
      setIsResetting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    const auth = getAuth();
    
    try {
      if (mode === "login") {
        const { email, password } = values as z.infer<typeof loginSchema>;
        
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.includes('google.com') && !methods.includes('password')) {
            toast({
                title: "Use o login com Google",
                description: "Essa conta foi criada com o Google. Use o botão 'Continuar com o Google' ou redefina sua senha para criar um acesso por e-mail.",
                variant: "destructive",
                duration: 8000,
            });
            setIsLoading(false);
            return;
        }

        await signInAdmin(email, password);
        sessionStorage.setItem('postLoginRefresh', 'true');
        toast({ title: "Que bom te ver de novo!", description: "Sua Central de Heróis está pronta para a aventura." });
        router.push("/dashboard");
      } else {
        const { name, email, password } = values as z.infer<typeof registerSchema>;
        const userProfile = await signUpAdmin(name, email, password);
        sessionStorage.setItem('postLoginRefresh', 'true');
        
        if (inviteCode) {
          try {
            await joinFamilyByInviteCode(userProfile.uid, inviteCode);
            toast({ title: "Boas-vindas à Equipe!", description: "Sua conta foi criada e você já se juntou à aventura em família." });
          } catch (e: any) {
            if (e.message === 'APPROVAL_PENDING') {
              toast({ title: "Pedido Enviado!", description: "Sua conta foi criada e um pedido para entrar na aliança foi enviado ao proprietário." });
            } else {
              toast({ title: "Erro ao entrar na Aliança", description: "Não foi possível entrar na aliança após o cadastro. Tente usar o código na página da Aliança.", variant: "destructive" });
            }
          }
        } else {
          toast({ title: "Sua Central de Mini Herois Foi Criada!", description: "Que comecem as grandes aventuras no Mini Herois!" });
        }
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error(`${mode} failed:`, error);
      let title = `${mode === "login" ? "Falha no Login" : "Falha no Cadastro"}`;
      let description = "Ocorreu um erro inesperado. Por favor, tente novamente.";

      if (mode === "login") {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             title = "E-mail ou senha incorretos?";
             description = "Acontece com os melhores heróis! Tente usar sua conta do Google para entrar com um clique. Se você ainda não tem uma Central de Mini Herois, crie uma agora e comece a diversão.";
        } else if (error.message) {
            description = error.message;
        }
      } else if (mode === "register") {
        if (error.code === 'auth/email-already-in-use') {
          description = "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.";
        } else {
          description = "Não foi possível criar a conta. Verifique os dados fornecidos ou tente novamente mais tarde.";
        }
      }
      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {mode === "register" && (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input className="rounded-xl" placeholder="Seu Nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input className="rounded-xl" type="email" placeholder="mestre@miniherois.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input className="rounded-xl" type={showPassword ? "text" : "password"} placeholder="Sua senha super-secreta" {...field} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={toggleShowPassword}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
               {mode === 'login' && (
                <div className="mt-1 text-right">
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="link" className="text-sm p-0 h-auto text-primary">Eita, esqueci minha senha?</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Recuperar Senha</AlertDialogTitle>
                        <AlertDialogDescription>
                            Não se preocupe, acontece com os melhores heróis! Digite seu e-mail abaixo e enviaremos um link para você criar uma nova senha.
                            <br />
                            <br />
                            <strong className="font-semibold">Se não encontrar o e-mail, dê uma olhadinha na sua caixa de spam!</strong>
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-2 py-2">
                        <Label htmlFor="email-reset">Seu e-mail de acesso</Label>
                        <Input
                            id="email-reset"
                            type="email"
                            placeholder="mestre@miniherois.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                        />
                        </div>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePasswordReset} disabled={isResetting}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Link de Recuperação
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
               )}
            </FormItem>
          )}
        />
        {mode === "register" && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirme a Senha</FormLabel>
                <FormControl>
                 <div className="relative">
                    <Input className="rounded-xl" type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                     <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={toggleShowPassword}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full rounded-xl text-lg h-12 shadow-clay hover:shadow-clay-hover active:shadow-clay-inset" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : mode === "login" ? (
            <LogIn className="mr-2 h-4 w-4" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {mode === "login" ? "Entrar com E-mail" : "Criar Conta"}
        </Button>
      </form>
    </Form>
  );
}
