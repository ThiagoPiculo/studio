
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="p-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2 flex-grow">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-1/4" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                </div>
                 <Skeleton className="h-24 w-full" />
            </CardContent>
            <CardFooter className="grid grid-cols-3 gap-1 p-1 border-t bg-muted/20">
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
