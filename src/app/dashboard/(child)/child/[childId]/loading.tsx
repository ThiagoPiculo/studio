
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
       <div className="sticky top-0 z-10 p-4 space-y-4">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <Skeleton className="h-8 w-16" />
              </div>
               <Skeleton className="h-8 w-8" />
            </header>
            
            <div className="flex flex-col gap-4 font-semibold">
                <Skeleton className="h-3 w-full" />
            </div>

            <Skeleton className="h-6 w-48 mx-auto" />
        </div>
      
      <div className="space-y-3 px-4 mt-4 overflow-y-auto flex-1 pb-24">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
