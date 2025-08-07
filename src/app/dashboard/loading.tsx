import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Skeleton className="h-8 w-8 rounded-md" />
             <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
