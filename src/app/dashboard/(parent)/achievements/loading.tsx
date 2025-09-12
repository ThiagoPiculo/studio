
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-56" />
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-16" /></div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    </div>
  );
}
