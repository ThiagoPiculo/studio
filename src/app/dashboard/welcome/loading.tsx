
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
       <Card className="w-full max-w-xl shadow-2xl rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-6 min-h-[450px]">
                <Skeleton className="w-20 h-20 rounded-full mb-2" />
                <Skeleton className="h-8 w-3/4" />
                <div className="space-y-3 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-12 w-1/2 mt-4" />
            </CardContent>
        </Card>
    </div>
  );
}
