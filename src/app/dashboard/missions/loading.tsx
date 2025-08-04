
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full mt-2" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8" />
                        <div className="space-y-2 flex-grow">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                         <div className="flex -space-x-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-9 w-full col-span-2" />
                    <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
