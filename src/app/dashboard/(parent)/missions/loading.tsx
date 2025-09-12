
"use client";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Loading() {
  return (
    <div className="space-y-8 pb-10">
        <Tabs defaultValue="ideas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ideas">
                    <Skeleton className="h-4 w-32" />
                </TabsTrigger>
                <TabsTrigger value="custom">
                    <Skeleton className="h-4 w-32" />
                </TabsTrigger>
            </TabsList>
            <TabsContent value="ideas" className="mt-6">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
