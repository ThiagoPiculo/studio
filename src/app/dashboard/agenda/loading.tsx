import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-32" />
            <Skeleton className="h-10 w-full sm:w-32" />
        </CardContent>
      </Card>
      
      <div className="border rounded-lg shadow-sm">
        <div className="grid grid-cols-7 text-center font-semibold text-sm text-muted-foreground p-2 border-b">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-28 border-r border-b p-1">
                <Skeleton className="h-4 w-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
