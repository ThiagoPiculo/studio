
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header Card Skeleton */}
      <Card className="shadow-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-primary/10 via-background to-accent/5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
            <div className="flex-grow space-y-2 mt-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-32" />
                 <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
                    <Skeleton className="h-8 w-24" />
                </div>
            </div>
          </div>
           <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
            </div>
        </div>
      </Card>

      {/* Tabs Skeleton */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1 p-1 bg-muted/50 rounded-lg">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md hidden md:block" />
        <Skeleton className="h-12 w-full rounded-md hidden md:block" />
        <Skeleton className="h-12 w-full rounded-md hidden md:block" />
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
         <Card className="hidden lg:block">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
