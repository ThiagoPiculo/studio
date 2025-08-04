
"use client";

import { useFamily } from '@/contexts/FamilyContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface FamilySwitcherClientProps {
    contextId: string;
    action: 'invite' | 'details';
}

export function FamilySwitcherClient({ contextId, action }: FamilySwitcherClientProps) {
    const { setCurrentContext } = useFamily();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        setCurrentContext(contextId);
        // The context switch might take a moment to propagate.
        // We push to the new route, and the layout/pages will re-render with the new context.
        if (action === 'invite') {
            router.push('/dashboard/family?action=invite');
        } else {
            router.push('/dashboard/family');
        }
    };

    if (action === 'invite') {
        return (
            <Button variant="outline" onClick={handleClick} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Convidar
            </Button>
        )
    }

    return (
        <Button onClick={handleClick} disabled={isLoading}>
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
    )
}
