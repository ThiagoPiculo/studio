
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-8 h-[600px]">
            <div className="col-span-1 space-y-2 pt-12 pr-2">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
            <div className="col-span-7 grid grid-cols-7 gap-1 border-l pl-1">
              {[...Array(7)].map((_, dayIndex) => (
                <div key={dayIndex} className="space-y-1">
                   <Skeleton className="h-6 w-full mb-2" />
                   <Skeleton className="h-24 w-full" />
                   <Skeleton className="h-16 w-full" />
                   <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
