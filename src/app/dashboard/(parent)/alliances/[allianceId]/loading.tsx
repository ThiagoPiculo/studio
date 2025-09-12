
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <Skeleton className="h-10 w-24" />
        </div>

        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                 <Skeleton className="h-6 w-56" />
                 <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-28" />
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-36" />
            </CardFooter>
        </Card>
    </div>
  );
}
