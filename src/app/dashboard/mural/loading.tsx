
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      {/* Hero Selector Skeleton */}
      <div className="flex w-full space-x-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 text-center w-20">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Main Card Skeleton */}
      <Card className="shadow-xl overflow-hidden">
        <div className="p-4 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
            <div className="flex-grow w-full space-y-2">
              <Skeleton className="h-8 w-1/2 sm:w-2/3" />
              <Skeleton className="h-5 w-1/3 sm:w-1/4" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-24" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        </div>
      </Card>

      {/* Tabs Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 h-auto lg:h-10 p-1 rounded-lg">
        {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>

      {/* Tabs Content Skeleton (for Overview) */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-3 w-full mt-1" />
                </CardContent>
              </Card>
          ))}
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                     <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-grow">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                     </div>
                ))}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
