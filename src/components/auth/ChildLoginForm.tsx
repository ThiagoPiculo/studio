
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { childLoginWithAccessCode, signInWithChildCustomToken, findChildByAccessCode } from "@/lib/firebase/firestore"; // Placeholder path, use actual firebase interaction
import { useAuth } from "@/contexts/AuthContext"; // Assuming AuthContext can handle child sessions

const childLoginSchema = z.object({
  accessCode: z.string().length(6, { message: "Access code must be 6 digits." }).regex(/^\d{6}$/, { message: "Access code must be 6 digits."}),
});

type ChildLoginFormValues = z.infer<typeof childLoginSchema>;

export function ChildLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // const { setChildAuthenticatedState } = useAuth(); // Assuming a method to set child auth state in AuthContext

  const form = useForm<ChildLoginFormValues>({
    resolver: zodResolver(childLoginSchema),
    defaultValues: { accessCode: "" },
  });

  const onSubmit = async (values: ChildLoginFormValues) => {
    setIsLoading(true);
    try {
      // Step 1: Client calls a (ideally backend) function to validate access code and get a custom token.
      // This is simplified / simulated here.
      // const tokenResponse = await childLoginWithAccessCode(values.accessCode); // This function would call your backend
      
      // For now, directly check access code and simulate token flow
      const childProfile = await findChildByAccessCode(values.accessCode);

      if (childProfile) {
        // In a real app, you would get a custom token from your backend for childProfile.id (or childProfile.uid)
        // Then use signInWithCustomToken(auth, customToken)
        // For this example, we'll simulate setting the child state directly after finding the profile.
        // This is NOT secure for a real application.
        // setChildAuthenticatedState(childProfile); // Update AuthContext
        
        toast({ title: "Login Successful", description: `Welcome, ${childProfile.name}!` });
        router.push(`/dashboard/child/${childProfile.id}`); // Navigate to a child-specific dashboard
      } else {
        throw new Error("Invalid access code. Please try again.");
      }

    } catch (error: any) {
      console.error("Child login failed:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Could not log in. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Your Secret Access Code</FormLabel>
              <FormControl>
                <Input 
                  placeholder="123456" 
                  {...field} 
                  className="h-14 text-2xl text-center tracking-[0.3em]"
                  maxLength={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-5 w-5" />
          )}
          Enter The