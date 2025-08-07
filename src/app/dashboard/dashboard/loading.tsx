import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                     <div className="space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-4 w-2/4" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <Skeleton className="h-8 w-full" />
                     <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        </div>
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-3">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-3/4" />
                         <Skeleton className="h-4 w-2/3" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
