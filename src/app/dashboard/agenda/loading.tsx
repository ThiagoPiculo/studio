
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-8" />
        </div>
        <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            <Skeleton className="h-10 w-48 flex-grow sm:flex-grow-0" />
            <Skeleton className="h-10 w-32 flex-grow sm:flex-grow-0" />
        </div>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-grow">
            <Skeleton className="h-9 w-20 hidden sm:block" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-48 flex-grow sm:flex-grow-0" />
          </div>
          <div className="flex items-center justify-end gap-x-2 gap-y-2 flex-wrap">
            <Skeleton className="h-9 w-20 sm:hidden flex-grow" />
            <Skeleton className="h-9 w-36 flex-grow sm:flex-grow-0" />
            <Skeleton className="h-9 w-32 flex-grow sm:flex-grow-0" />
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(day => (
          <div key={day} className="flex flex-col space-y-2">
             <Skeleton className="h-7 w-32" />
            <Card className="shadow-sm flex-1">
              <CardContent className="p-4 space-y-4">
                 <div className="relative space-y-2 bg-yellow-500/5 p-3 rounded-lg">
                    <Skeleton className="h-4 w-16 absolute top-2 right-2" />
                     <div className="flex items-start gap-4 pt-8">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
