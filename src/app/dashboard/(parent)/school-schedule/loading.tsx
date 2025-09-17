
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-2 p-2 rounded-lg bg-muted/30">
                            <Skeleton className="h-5 w-20 mx-auto" />
                            <Skeleton className="h-16 w-full rounded-md" />
                            <Skeleton className="h-16 w-full rounded-md" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-2 p-2 rounded-lg bg-muted/30">
                            <Skeleton className="h-5 w-20 mx-auto" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
