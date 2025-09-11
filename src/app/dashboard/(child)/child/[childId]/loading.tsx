
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="p-4 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      
      <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Card className="p-4">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-grow">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
              </div>
          </Card>
           <Card className="p-4">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-grow">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
              </div>
          </Card>
      </div>

       <div className="fixed bottom-0 left-0 w-full h-16 bg-background/80 border-t grid grid-cols-3">
            <div className="flex flex-col items-center justify-center gap-1">
                <Skeleton className="h-6 w-6 rounded-md"/>
                <Skeleton className="h-3 w-10"/>
            </div>
             <div className="flex flex-col items-center justify-center gap-1">
                <Skeleton className="h-6 w-6 rounded-md"/>
                <Skeleton className="h-3 w-10"/>
            </div>
             <div className="flex flex-col items-center justify-center gap-1">
                <Skeleton className="h-6 w-6 rounded-md"/>
                <Skeleton className="h-3 w-10"/>
            </div>
       </div>
    </div>
  );
}
