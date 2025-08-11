import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
       <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/3 ml-auto" />
                <Skeleton className="h-3 w-full rounded-full" />
                <div className="flex flex-col md:flex-row gap-4 pt-2">
                    <Skeleton className="h-16 w-full flex-1 rounded-lg" />
                    <Skeleton className="h-16 w-full flex-1 rounded-lg" />
                    <Skeleton className="h-16 w-full flex-1 rounded-lg" />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
