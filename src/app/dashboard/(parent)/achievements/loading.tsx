
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Loading() {
  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-full mt-2 max-w-lg" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-48" />
            </CardContent>
        </Card>
        
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                 <Card key={i} className="p-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-4" />
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center hidden sm:flex"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div>
                        <div className="space-y-2 flex flex-col items-center hidden lg:flex"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
}
