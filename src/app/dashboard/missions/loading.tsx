
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full max-w-sm mt-2" />
            </div>
            <div className="flex w-full sm:w-auto gap-2">
                <Skeleton className="h-10 flex-grow sm:w-48" />
                <Skeleton className="h-10 flex-grow sm:w-36" />
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-3 pr-2 min-h-14 flex-grow">
                            <Skeleton className="h-8 w-8 mt-1" />
                            <Skeleton className="h-5 w-3/4" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow p-4 pt-0">
                   <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  <Skeleton className="h-px w-full my-3" />
                  <div className="flex-grow" />
                  <div className="pt-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex items-center -space-x-2 min-h-[32px]">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
