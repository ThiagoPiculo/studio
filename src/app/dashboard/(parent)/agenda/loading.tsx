
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-grow">
              <Skeleton className="h-9 w-20 shrink-0" />
              <div className="flex items-center shrink-0">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
               <Skeleton className="h-6 w-48" />
            </div>
            
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-x-2 md:gap-y-2 md:flex-wrap">
              <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                <Skeleton className="h-9 w-full sm:w-36" />
                <Skeleton className="h-9 w-full sm:w-32" />
              </div>
               <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-9 w-32" />
               </div>
            </div>
          </div>
        </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(day => (
          <div key={day} className="flex flex-col space-y-2">
             <Skeleton className="h-7 w-32 mb-2" />
             <div className="space-y-2">
                <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-9 rounded-full"/>
                            <Skeleton className="h-5 w-24"/>
                        </div>
                        <Skeleton className="h-4 w-4"/>
                    </div>
                     <div className="border-t pt-2 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-9 rounded-full"/>
                            <Skeleton className="h-5 w-24"/>
                        </div>
                        <Skeleton className="h-4 w-4"/>
                    </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
