
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 flex-grow sm:w-72" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="p-4">
                <div className="flex items-center justify-end">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex items-center gap-4 mt-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2 flex-grow">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                    <div className="flex items-center justify-around">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-7 w-24" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                </div>
            </CardContent>
            <CardContent className="px-4 pb-0 flex-grow">
                <div className="grid grid-cols-2 gap-1 h-9 mb-2">
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                </div>
                 <div className="space-y-1.5 h-[145px]">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                 </div>
            </CardContent>
            <CardFooter className="grid grid-cols-3 gap-1 p-1 border-t bg-muted/20 mt-auto">
                <div className="p-2 space-y-1">
                    <Skeleton className="h-5 w-1/2 mx-auto" />
                    <Skeleton className="h-3 w-full mx-auto" />
                </div>
                <div className="p-2 space-y-1">
                    <Skeleton className="h-5 w-1/2 mx-auto" />
                    <Skeleton className="h-3 w-full mx-auto" />
                </div>
                <div className="p-2 space-y-1">
                    <Skeleton className="h-5 w-1/2 mx-auto" />
                    <Skeleton className="h-3 w-full mx-auto" />
                </div>
            </CardFooter>
        </Card>
        ))}
      </div>
    </div>
  );
}
