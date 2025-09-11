
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
            <div className="flex items-center gap-1">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
            </div>
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
             <Skeleton className="h-7 w-32 mb-2" />
             <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
