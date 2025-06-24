import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-1/3" />
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
             <Skeleton className="h-6 w-3/4" />
             <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28" />
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                     <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28" />
             </div>
          </CardContent>
        </Card>
    </div>
  );
}
