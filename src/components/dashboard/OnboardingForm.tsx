
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
import { useAuth } from "@/contexts/AuthContext";
import { addChildProfile } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const onboardingSchema = z.object({
  childName: z.string().min(2, { message: "Child's name must be at least 2 characters." }).max(50, { message: "Child's name must be 50 characters or less." }),
  childAge: z.coerce.number().min(1, { message: "Age must be at least 1." }).max(18, { message: "Age must be 18 or less." }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      childName: "",
      childAge: undefined,
    },
  });

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a child.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await addChildProfile(user.uid, { name: values.childName, age: values.childAge });
      toast({ title: "MiniHero Added!", description: `${values.childName} is ready for adventure!` });
      // Optionally, redirect to the main dashboard or a page listing children
      router.push("/dashboard"); 
      // Or refresh data if staying on the same page and displaying a list
      // form.reset(); // Reset form after successful submission
    } catch (error: any) {
      console.error("Failed to add child profile:", error);
      toast({
        title: "Failed to Add MiniHero",
        description: error.message || "An unexpected error occurred. Please try again.",
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
          name="childName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Child's Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Alex" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="childAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Child's Age</FormLabel>
              <FormControl>
                <Input type="number" placeholder="E.g., 7" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Add MiniHero
        </Button>
      </form>
    </Form>
  );
}
